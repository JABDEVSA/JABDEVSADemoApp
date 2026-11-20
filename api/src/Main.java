import com.google.gson.*;
import com.sun.net.httpserver.*;
import org.sqlite.SQLiteConfig;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.sql.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.*;

/** Local POST-only API. Authentication and ownership are checked before Python execution. */
public class Main {
    static final Gson JSON = new Gson();
    static final ZoneId SAST = ZoneId.of("Africa/Johannesburg");
    static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSSSSSSSSxxx");
    static final SecureRandom RANDOM = new SecureRandom();
    static final Semaphore WORKERS = new Semaphore(4);
    static final Map<String, Deque<Long>> ATTEMPTS = new ConcurrentHashMap<>();
    static JsonObject config;

    static class ApiError extends RuntimeException {
        final int status;
        ApiError(int status, String message) { super(message); this.status = status; }
    }
    static String now() { return OffsetDateTime.now(SAST).format(TIME); }
    static String str(JsonObject object, String name) { return object.has(name) && !object.get(name).isJsonNull() ? object.get(name).getAsString() : ""; }
    static JsonObject object(Object value) { return JSON.toJsonTree(value).getAsJsonObject(); }
    static void require(boolean condition, String message) { if (!condition) throw new ApiError(400, message); }
    static String randomToken() { byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    static String hash(String value) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    static String password(String value, byte[] salt) throws Exception {
        PBEKeySpec key = new PBEKeySpec(value.toCharArray(), salt, 600_000, 256);
        try { return Base64.getEncoder().encodeToString(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(key).getEncoded()); }
        finally { key.clearPassword(); }
    }
    static Connection db() throws SQLException {
        SQLiteConfig settings = new SQLiteConfig(); settings.setBusyTimeout(5000);
        return DriverManager.getConnection("jdbc:sqlite:" + str(config,"Database"), settings.toProperties());
    }
    static List<Map<String,Object>> query(String name, Map<String,?> params, boolean read) throws Exception {
        String sql = Files.readString(Path.of("../database/queries", name + ".sql"));
        Matcher matcher = Pattern.compile("\\$([a-z]+)").matcher(sql);
        List<Object> values = new ArrayList<>();
        StringBuffer statement = new StringBuffer();
        while (matcher.find()) { values.add(params.get(matcher.group(1))); matcher.appendReplacement(statement, "?"); }
        matcher.appendTail(statement);
        try (Connection connection = db(); PreparedStatement command = connection.prepareStatement(statement.toString())) {
            for (int i=0;i<values.size();i++) command.setObject(i+1,values.get(i));
            List<Map<String,Object>> result = new ArrayList<>();
            if (!read) { command.executeUpdate(); return result; }
            try (ResultSet rows = command.executeQuery()) {
                ResultSetMetaData columns = rows.getMetaData();
                while (rows.next()) { Map<String,Object> row = new LinkedHashMap<>(); for(int i=1;i<=columns.getColumnCount();i++) row.put(columns.getColumnLabel(i),rows.getObject(i)); result.add(row); }
            }
            return result;
        }
    }
    static String cookie(HttpExchange exchange) {
        String cookies = exchange.getRequestHeaders().getFirst("Cookie");
        if (cookies != null) for (String cookie : cookies.split(";")) if(cookie.trim().startsWith("dd_session=")) return cookie.trim().substring(11);
        return "";
    }
    static Map<String,Object> user(HttpExchange exchange) throws Exception {
        List<Map<String,Object>> result = query("session_user", Map.of("token",hash(cookie(exchange)),"now",now()),true);
        if (result.isEmpty()) throw new ApiError(401,"Sign in to access your workspace.");
        return result.get(0);
    }
    static void setCookie(HttpExchange exchange, String token, int age) {
        exchange.getResponseHeaders().add("Set-Cookie","dd_session="+token+"; Path=/api; HttpOnly; SameSite=Strict; Max-Age="+age+(config.get("SecureCookies").getAsBoolean()?"; Secure":""));
    }
    static void signIn(HttpExchange exchange, String userId) throws Exception {
        String token=randomToken(); int hours=config.get("SessionHours").getAsInt();
        query("delete_session",Map.of("token",hash(cookie(exchange))),false);
        query("prune_sessions",Map.of("now",now()),false);
        query("create_session",Map.of("token",hash(token),"user",userId,"expires",OffsetDateTime.now(SAST).plusHours(hours).format(TIME)),false);
        setCookie(exchange,token,hours*3600);
    }
    static void rateLimit(HttpExchange exchange) {
        String ip=exchange.getRemoteAddress().getAddress().getHostAddress();
        Deque<Long> times=ATTEMPTS.computeIfAbsent(ip,k->new ArrayDeque<>());
        synchronized(times) { long now=System.nanoTime(); while(!times.isEmpty() && now-times.peekFirst()>300_000_000_000L)times.removeFirst(); if(times.size()>=20)throw new ApiError(429,"Too many sign-in attempts. Try again in five minutes.");times.addLast(now); }
    }
    static JsonObject python(JsonObject request) throws Exception {
        if (!WORKERS.tryAcquire()) throw new ApiError(429,"Analysis is busy. Please try again shortly.");
        Process process=null;
        try {
            JsonObject settings=config.getAsJsonObject("Python");
            process=new ProcessBuilder(str(settings,"Executable"),str(settings,"Script")).redirectError(ProcessBuilder.Redirect.DISCARD).start();
            final Process running=process;
            CompletableFuture<byte[]> output=CompletableFuture.supplyAsync(()->{try{return running.getInputStream().readAllBytes();}catch(IOException e){throw new CompletionException(e);}});
            try(OutputStream input=process.getOutputStream()){input.write(JSON.toJson(request).getBytes(StandardCharsets.UTF_8));}
            if(!process.waitFor(25,TimeUnit.SECONDS)){process.destroyForcibly();throw new ApiError(503,"Analysis timed out. Try a smaller dataset.");}
            JsonObject result=JsonParser.parseString(new String(output.get(5,TimeUnit.SECONDS),StandardCharsets.UTF_8)).getAsJsonObject();
            if(result.has("error"))throw new ApiError(400,str(result,"error"));
            if(process.exitValue()!=0)throw new ApiError(503,"The analysis engine could not finish.");
            return result;
        } finally {if(process!=null && process.isAlive())process.destroyForcibly();WORKERS.release();}
    }
    static Map<String,Object> dataset(String id, Object userId) throws Exception {
        List<Map<String,Object>> rows=query("get_dataset",Map.of("id",id,"user",userId),true);
        if(rows.isEmpty())throw new ApiError(404,"Dataset not found in your workspace.");return rows.get(0);
    }
    static Object route(HttpExchange exchange, String path, JsonObject input) throws Exception {
        if(path.equals("/api/auth/register") || path.equals("/api/auth/login")) {
            rateLimit(exchange);
            String email=str(input,"email").strip().toLowerCase(Locale.ROOT), pass=str(input,"password"), name=str(input,"name").strip();
            require(email.length()<=254 && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"),"Enter a valid email address.");
            require(pass.length()>=10 && pass.length()<=128,"Use a password between 10 and 128 characters.");
            List<Map<String,Object>> existing=query("user_by_email",Map.of("email",email),true);
            Map<String,Object> identity;
            if(path.endsWith("register")) {
                require(name.length()>=2 && name.length()<=80,"Enter your name (2–80 characters).");
                if(!existing.isEmpty())throw new ApiError(409,"An account with this email already exists. Please sign in.");
                String id=UUID.randomUUID().toString();byte[] salt=new byte[16];RANDOM.nextBytes(salt);
                try {query("create_user",Map.of("id",id,"name",name,"email",email,"hash",password(pass,salt),"salt",Base64.getEncoder().encodeToString(salt),"created",now()),false);}
                catch(SQLException e){if(e.getErrorCode()==19)throw new ApiError(409,"An account with this email already exists.");throw e;}
                identity=Map.of("id",id,"name",name,"email",email);
            } else {
                // Always perform the password derivation, including unknown email addresses.
                byte[] salt=existing.isEmpty()?new byte[16]:Base64.getDecoder().decode((String)existing.get(0).get("salt"));
                String derived=password(pass,salt);
                if(existing.isEmpty() || !MessageDigest.isEqual(derived.getBytes(StandardCharsets.UTF_8),((String)existing.get(0).get("password_hash")).getBytes(StandardCharsets.UTF_8)))throw new ApiError(401,"Email or password is incorrect.");
                Map<String,Object> row=existing.get(0);identity=Map.of("id",row.get("id"),"name",row.get("name"),"email",row.get("email"));
            }
            signIn(exchange,(String)identity.get("id"));return Map.of("user",identity);
        }
        if(path.equals("/api/auth/logout")){query("delete_session",Map.of("token",hash(cookie(exchange))),false);setCookie(exchange,"",0);return Map.of("ok",true);}
        Map<String,Object> identity=user(exchange);
        if(path.equals("/api/auth/session"))return Map.of("user",identity);
        if(path.equals("/api/datasets/list"))return Map.of("datasets",query("list_datasets",Map.of("user",identity.get("id")),true));
        if(path.equals("/api/datasets/sample") || path.equals("/api/datasets/upload")) {
            require(query("list_datasets",Map.of("user",identity.get("id")),true).size()<30,"This demo supports 30 saved datasets per account.");
            String csv, name;
            if(path.endsWith("sample")){JsonObject sample=python(object(Map.of("action","sample","kind",str(input,"kind"))));csv=str(sample,"csv");name=str(sample,"name");}
            else {csv=str(input,"csv");name=str(input,"name").strip();require(name.length()>0 && name.length()<=120,"Use a filename of 1–120 characters.");python(object(Map.of("action","validate","csv",csv)));}
            String id=UUID.randomUUID().toString(), created=now();
            query("create_dataset",Map.of("id",id,"user",identity.get("id"),"name",name,"csv",csv,"created",created),false);
            return Map.of("dataset",Map.of("id",id,"name",name,"created_at",created));
        }
        if(Set.of("/api/datasets/profile","/api/datasets/rows","/api/datasets/preview","/api/datasets/export").contains(path)){
            Map<String,Object> record=dataset(str(input,"id"),identity.get("id"));
            input.addProperty("csv",(String)record.get("csv"));input.addProperty("action",path.substring(path.lastIndexOf('/')+1));
            JsonObject result=python(input);
            if(path.endsWith("export"))result.addProperty("filename",((String)record.get("name")).replaceFirst("(?i)\\.csv$","")+"-cleaned.csv");
            return result;
        }
        throw new ApiError(404,"API operation not found.");
    }
    static void handle(HttpExchange exchange) throws IOException {
        int status=200; Object result;
        try {
            if(!exchange.getRequestMethod().equals("POST"))throw new ApiError(405,"Use POST for API requests.");
            String origin=exchange.getRequestHeaders().getFirst("Origin");
            if(origin!=null && !config.getAsJsonArray("AllowedOrigins").contains(new JsonPrimitive(origin)))throw new ApiError(403,"This request origin is not allowed.");
            String contentType=exchange.getRequestHeaders().getFirst("Content-Type");
            if(contentType==null || !contentType.toLowerCase(Locale.ROOT).startsWith("application/json"))throw new ApiError(415,"Send application/json.");
            byte[] body=exchange.getRequestBody().readNBytes(3_000_001);
            if(body.length>3_000_000)throw new ApiError(413,"Request is too large. Use a CSV below 1 MB.");
            JsonElement parsed=JsonParser.parseString(new String(body,StandardCharsets.UTF_8));
            require(parsed.isJsonObject(),"Send a JSON object.");
            JsonObject input=parsed.getAsJsonObject();
            result=route(exchange,exchange.getRequestURI().getPath(),input);
        } catch(ApiError error){status=error.status;result=Map.of("error",error.getMessage());}
        catch(JsonParseException|IllegalStateException|IllegalArgumentException error){status=400;result=Map.of("error","The request contains invalid values.");}
        catch(Exception error){status=500;System.err.println(now()+" Request failed: "+error.getClass().getSimpleName());result=Map.of("error","The request could not be completed. Please try again.");}
        byte[] response=JSON.toJson(result).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control","no-store");
        exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");
        exchange.sendResponseHeaders(status,response.length);
        try(OutputStream output=exchange.getResponseBody()){output.write(response);}finally{exchange.close();}
    }
    public static void main(String[] args) throws Exception {
        config=JsonParser.parseString(Files.readString(Path.of("appsettings.json"))).getAsJsonObject();
        Path local=Path.of("appsettings.Local.json");
        if(Files.exists(local)){JsonObject overrides=JsonParser.parseString(Files.readString(local)).getAsJsonObject();for(var entry:overrides.entrySet()){if(entry.getValue().isJsonObject() && config.has(entry.getKey())){for(var nested:entry.getValue().getAsJsonObject().entrySet())config.getAsJsonObject(entry.getKey()).add(nested.getKey(),nested.getValue());}else config.add(entry.getKey(),entry.getValue());}}
        Files.createDirectories(Path.of(str(config,"Database")).toAbsolutePath().getParent());
        try(Connection connection=db();Statement command=connection.createStatement()){for(String sql:Files.readString(Path.of("../database/schema.sql")).split(";"))if(!sql.isBlank())command.execute(sql);}
        HttpServer server=HttpServer.create(new InetSocketAddress(str(config,"Host"),config.get("Port").getAsInt()),0);
        server.createContext("/api/",Main::handle);server.setExecutor(Executors.newFixedThreadPool(12));server.start();
        System.out.println(now()+" Data Detective Java API listening on http://"+str(config,"Host")+":"+config.get("Port"));
    }
}
