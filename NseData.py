from flask import Flask, jsonify,request
from nsetools import Nse
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import os
app = Flask(__name__)
CORS(app)
nse = Nse()

@app.route('/api/gainers')
def get_gainers():
    return jsonify(nse.get_top_gainers())

@app.route('/api/losers')
def get_losers():
    return jsonify(nse.get_top_losers())

@app.route('/api/index')
def get_quote():
    return jsonify(nse.get_all_index_quote())
@app.route('/api/indices')
def get_index():
    try:
        d1 = yf.download("^NSEI", period='2d', interval='5m', progress=False)
        d2 = yf.download("^BSESN", period='2d', interval='5m', progress=False)
        def clean_df(df):
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = ['_'.join(col).strip() if isinstance(col, tuple) else col 
                              for col in df.columns.values]

            df = df.reset_index()
  
            for col in df.columns:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    df[col] = df[col].astype(str)
            
            return df
        
        d1 = clean_df(d1)
        d2 = clean_df(d2)
        
        return jsonify({
            'nifty': d1.to_dict(orient='records'),
            'sensex': d2.to_dict(orient='records')
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/api/indexgraph',methods=['POST'])
def get_indice():
    try:
        data = request.get_json()
        name = data.get('name')
        d1 = yf.download(name, period='2d', interval='5m', progress=False)
        
        def clean_df(df):
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = ['_'.join(col).strip() if isinstance(col, tuple) else col 
                              for col in df.columns.values]

            df = df.reset_index()
  
            for col in df.columns:
                if pd.api.types.is_datetime64_any_dtype(df[col]):
                    df[col] = df[col].astype(str)
            
            return df
        
        d1 = clean_df(d1)
        
        return jsonify({
            'data': d1.to_dict(orient='records')
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0',port=port)