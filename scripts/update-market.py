"""Refresh the static S&P 500 price quote. Keeps the original price baseline."""
import csv,datetime,io,json,pathlib,subprocess,os
root=pathlib.Path(__file__).resolve().parents[1]
path=root/'data/market.json'
today=datetime.date.today()
url='https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd='+str(today-datetime.timedelta(days=30))
download=subprocess.run(['curl','--fail','--silent','--show-error','--location','--retry','2','--max-time','35',url],capture_output=True,text=True,check=True)
rows=list(csv.DictReader(io.StringIO(download.stdout)))
valid=[]
for row in rows:
    try:
        date=datetime.date.fromisoformat(row['observation_date']);close=float(row['SP500'])
        if today-datetime.timedelta(days=30)<=date<=today and 100<close<100000:valid.append((date,close))
    except (ValueError,KeyError):pass
if not valid:raise RuntimeError('No valid recent quote; existing prices preserved')
date,close=max(valid)
old=json.loads(path.read_text())
if str(date)<old['date']:raise RuntimeError('Refusing older quote')
quote={**old,'date':str(date),'close':close,'source':'https://fred.stlouisfed.org/series/SP500'}
temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(quote,indent=2)+'\n');os.replace(temporary,path)
print(f'S&P 500: {close} ({date})')
