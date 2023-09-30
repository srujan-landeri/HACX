import asyncio
import websockets
import json
import pandas as pd
from io import StringIO
import time
import numpy as np 
import os
import subprocess
import signal
import subprocess
import warnings 
import numpy as np 
import pickle
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import threading
import netifaces
from sklearn.preprocessing import QuantileTransformer, PowerTransformer, MinMaxScaler

# Communication between frontend and backend
async def websocket_handler(websocket, path):
    async for message in websocket:
        data = json.loads(message)

        if data['Type'] == 'File':
            csv_data = data['Data']
            csvStringIO = StringIO(csv_data)
            df = pd.read_csv(StringIO(csv_data), delimiter=',')
            await websocket.send("File received")
            response = json.dumps(process_logs(df));
            print("response",response,flush=True)
            if(response == "error"):
                await websocket.send(response)
            else:
                await websocket.send(str(response))
        
        else:
            await websocket.send("unknown operation")

# Porcesing the logs
def process_logs(df):
    try:

        layer_1 = df[['dst_port', 'flow_duration', 'flow_byts_s', 'flow_pkts_s', 'fwd_pkts_s',
       'bwd_pkts_s', 'tot_fwd_pkts', 'tot_bwd_pkts', 'totlen_fwd_pkts',
       'totlen_bwd_pkts', 'fwd_pkt_len_max', 'fwd_pkt_len_mean',
       'fwd_pkt_len_std', 'bwd_pkt_len_max', 'bwd_pkt_len_mean',
       'bwd_pkt_len_std', 'pkt_len_max', 'pkt_len_mean', 'pkt_len_std',
       'pkt_len_var', 'fwd_header_len', 'bwd_header_len', 'fwd_seg_size_min',
       'flow_iat_mean', 'flow_iat_max', 'flow_iat_min', 'flow_iat_std',
       'fwd_iat_tot', 'fwd_iat_max', 'fwd_iat_min', 'fwd_iat_mean',
       'fwd_iat_std', 'bwd_iat_tot', 'bwd_iat_max', 'psh_flag_cnt',
       'ack_flag_cnt', 'down_up_ratio', 'pkt_size_avg', 'init_fwd_win_byts',
       'init_bwd_win_byts']]
    
    except Exception:
        return "error"

    script_dir = os.path.dirname(os.path.abspath(__file__))

    print("script dirrr: " + script_dir, flush=True)
    
    # importing scalers
    min_max = pickle.load(open(os.path.join(script_dir, 'Scalers', 'scalar_min_max.pkl'), 'rb'))
    quantile = pickle.load(open(os.path.join(script_dir, 'Scalers', 'scalar_quantile.pkl'),'rb'))
    power = pickle.load(open(os.path.join(script_dir, 'Scalers', 'scalar_power.pkl'),'rb'))


    layer_1 = quantile.transform(layer_1)

    # import Layer1 model

    layer_1_model = pickle.load(open(os.path.join(script_dir, 'ML Models', 'Layer1', 'xgb_classifier.pkl'), 'rb'))

    # predict layer 1

    layer_1_pred = layer_1_model.predict(layer_1)

    if(len(np.unique(layer_1_pred)) == 1 and np.unique(layer_1_pred)[0] == 0):
        return "0"

    else:

        malacious = np.where(layer_1_pred == 1)[0]

        # getting 2nd layer data from df of malacious indices

        layer_2 = df[['flow_duration', 'flow_byts_s', 'flow_pkts_s', 'fwd_pkts_s',
                    'bwd_pkts_s', 'tot_fwd_pkts', 'tot_bwd_pkts', 'totlen_fwd_pkts',
                    'totlen_bwd_pkts', 'fwd_pkt_len_max', 'fwd_pkt_len_min',
                    'fwd_pkt_len_mean', 'fwd_pkt_len_std', 'bwd_pkt_len_max',
                    'bwd_pkt_len_min', 'bwd_pkt_len_mean', 'bwd_pkt_len_std', 'pkt_len_max',
                    'pkt_len_min', 'pkt_len_mean', 'pkt_len_std', 'pkt_len_var',
                    'fwd_header_len', 'bwd_header_len', 'fwd_seg_size_min',
                    'fwd_act_data_pkts', 'flow_iat_mean', 'flow_iat_max', 'flow_iat_min',
                    'flow_iat_std', 'fwd_iat_tot', 'fwd_iat_max', 'fwd_iat_min',
                    'fwd_iat_mean', 'fwd_iat_std', 'bwd_iat_tot', 'bwd_iat_max',
                    'bwd_iat_min', 'bwd_iat_mean', 'bwd_iat_std', 'fin_flag_cnt',
                    'down_up_ratio', 'pkt_size_avg', 'init_fwd_win_byts',
                    'init_bwd_win_byts', 'active_max', 'active_min', 'active_mean',
                    'active_std', 'idle_max', 'idle_min', 'idle_mean', 'idle_std']]

        print(len(layer_2.columns),flush=True)
        layer_2 = layer_2.iloc[malacious]
        print(len(layer_2))

        layer2_power_tr = power.transform(layer_2)

        # folder_path = "../Backend/ML Models/Layer2/"  # Provide the path to your folder
        folder_path = os.path.join(script_dir, 'ML Models', 'Layer2')
        pkls = []

        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if filename.endswith(".pkl"):
                with open(file_path, "rb") as file:
                    data = pickle.load(file)
                    pklFile = {
                                "attack": file.name.split('/')[-1],
                                "data": data,
                            }
                    pkls.append(pklFile)

        probable_attacks = []


        for i in pkls:
            if(i['attack'] == 'Dos Hulk.pkl'):
                model = pickle.load(open(os.path.join(script_dir, 'ML Models', 'Layer2', 'Dos Hulk.pkl'),'rb'))
                y_pred = model.predict(min_max.transform(layer_2))

            else:
                y_pred = i['data'].predict(layer2_power_tr)
            

            print(i['attack'],np.unique(y_pred,return_counts=True))
            unique_value, unique_counts = np.unique(y_pred,return_counts=True)

            if(len(unique_value) == 1 and unique_value[0] == 1): # Detected all as inliers
                probable_attacks.append({
                    'attack':i['attack'].split('\\')[-1],
                    'confidence':round(((unique_counts[0])/len(layer_2)) * 100,2)
                    })

            if(len(unique_value) == 1 and unique_value[0] == -1): # Detected all as outliers
                pass 

            if(len(unique_value) == 2):
                outlier_count = unique_counts[0]
                inlier_count = unique_counts[1]

                probable_attacks.append({
                    'attack':i['attack'].split('\\')[-1],
                    'confidence': round(((inlier_count)/len(layer_2)) * 100,2)
                })

        if(len(probable_attacks) == 0):
            probable_attacks.append('Zero Day Attack')

        print("Predicted as:",probable_attacks,flush=True)
        print(probable_attacks)
        return probable_attacks;
    

if __name__ == '__main__':  
    print('Running upload websocket',flush=True)
    start_server = websockets.serve(websocket_handler, 'localhost', 8002, max_size=1024 * 1024 * 1024)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()