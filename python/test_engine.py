import unittest
import engine


class AnalysisTests(unittest.TestCase):
    def test_all_samples_deterministic_and_profiled(self):
        for kind, size in [('retail',1200),('subscriptions',850),('logistics',640)]:
            with self.subTest(kind=kind):
                sample=engine.sample(kind)
                self.assertEqual(sample,engine.sample(kind))
                result=engine.handle({'csv':sample['csv']})
                self.assertEqual(result['rows'],size)
                self.assertEqual(result['columnCount'],7)
                for key in ['missing','duplicates','whitespace','outliers']:
                    self.assertGreater(result[key],0)

    def test_exact_profile_and_iqr(self):
        text='category,value\n A ,1\nA,1\nA,1\nB,2\nB,2\nB,3\n,100\n'
        result=engine.handle({'csv':text})
        self.assertEqual(result['duplicates'],2)
        self.assertEqual(result['missing'],1)
        self.assertEqual(result['whitespace'],1)
        self.assertEqual(result['outliers'],1)
        self.assertEqual(sum(x['value'] for x in result['chart']),110)

    def test_preview_preserves_original_and_cleans_in_order(self):
        text='name,value\n Alice ,1\nAlice,1\nBob,\n'
        result=engine.handle({'action':'preview','csv':text,'options':{'trim':True,'deduplicate':True,'fillMissing':True,'replacement':'0'}})
        self.assertEqual(result['before']['rows'],3)
        self.assertEqual(result['after']['rows'],2)
        self.assertEqual(result['after']['quality'],100)
        self.assertEqual(result['rows'],[['Alice','1'],['Bob','0']])
        self.assertEqual(engine.handle({'csv':text})['rows'],3)

    def test_filter_numeric_sort_and_page_bounds(self):
        text='name,value\nA,10\nB,2\nA,1\n'
        rows=engine.handle({'action':'rows','csv':text,'search':'a','sort':'value','direction':'asc','pageSize':1,'page':500})
        self.assertEqual(rows['total'],2)
        self.assertEqual(rows['page'],2)
        self.assertEqual(rows['rows'],[['A','10']])

    def test_empty_search_result(self):
        result=engine.handle({'action':'rows','csv':'a,b\n1,2\n','search':'none'})
        self.assertEqual(result['total'],0)
        self.assertEqual(result['pages'],1)
        self.assertEqual(result['rows'],[])

    def test_csv_quotes_bom_and_multiline(self):
        headers,rows=engine.parse('\ufeffname,note\n"A, B","first\nsecond"\n')
        self.assertEqual(headers,['name','note'])
        self.assertEqual(rows,[['A, B','first\nsecond']])

    def test_invalid_input_rejected(self):
        for text in ['', 'a,a\n1,2\n','a,b\n1\n','a,b\n','a,b\n"unterminated,2', 'a\n\x00', 'a\n'+'x'*1_000_000]:
            with self.subTest(text=text[:30]),self.assertRaises(ValueError):engine.parse(text)

    def test_row_column_bounds(self):
        with self.assertRaises(ValueError):engine.parse('a\n'+'1\n'*20_001)
        with self.assertRaises(ValueError):engine.parse(','.join(str(n) for n in range(81))+'\n'+','.join('1' for _ in range(81)))

    def test_nonfinite_and_mixed_columns_are_text(self):
        result=engine.handle({'csv':'a,b\nNaN,1\nInfinity,word\n'})
        self.assertEqual([c['type'] for c in result['columns']],['text','text'])

    def test_single_value_numeric(self):
        result=engine.handle({'csv':'n\n4\n'})
        self.assertEqual(result['columns'][0]['mean'],4)
        self.assertEqual(result['outliers'],0)

    def test_export_escapes_formula_text_but_preserves_negative_numbers(self):
        result=engine.handle({'action':'export','csv':'name,value\n=SUM(A1),-15\n@cmd,+note\n','options':{}})
        self.assertIn("'=SUM(A1),-15",result['csv'])
        self.assertIn("'@cmd,'+note",result['csv'])

    def test_empty_row_removal_and_invalid_replacement(self):
        result=engine.handle({'action':'preview','csv':'a,b\n,\nA,1\n','options':{'dropEmptyRows':True}})
        self.assertEqual(result['after']['rows'],1)
        with self.assertRaises(ValueError):engine.handle({'action':'preview','csv':'a\nA\n','options':{'fillMissing':True,'replacement':''}})

    def test_invalid_request_shape(self):
        with self.assertRaises(ValueError):engine.handle(None)
        with self.assertRaises(ValueError):engine.handle({'action':'preview','csv':'a\nA\n','options':['trim']})


if __name__=='__main__':unittest.main(verbosity=2)
