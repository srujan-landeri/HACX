import asyncio
import websockets
import json
import pandas as pd
import time
import numpy as np 
import os
import subprocess
import signal
import subprocess
import warnings 
import numpy as np 
import pickle
import netifaces
import threading
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer
from winotify import Notification
from datetime import datetime
from io import StringIO
import random


toastAlert1 = Notification(
                     app_id="defender.io",
                     title="Defender",
                     msg="No Malicious activity detected",
                     duration="short",
                     icon=r'D:\Programming\Project School\Application\Frontend\pages\assets\warning.png'
                    )

toastAlert2 = Notification(
                     app_id="defender.io",
                     title="Defender",
                     msg="Malicious activity detected",
                     duration="short",
                     icon=r'D:\Programming\Project School\Application\Frontend\pages\assets\warning.png'
                    )

toastAlert3 = Notification(
                     app_id="defender.io",
                     title="Defender",
                     msg="defender started defending",
                     duration="short",
                     icon=r'D:\Programming\Project School\Application\Frontend\pages\assets\warning.png'
                    )

toastAlert4 = Notification(
                     app_id="defender.io",
                     title="Defender",
                     msg="Processing Logs",
                     duration="short",
                     icon=r'D:\Programming\Project School\Application\Frontend\pages\assets\warning.png'                 
                    )

def toastAlertPort(port):
    toastAlert5 = Notification(
                     app_id="defender.io",
                     title="Defender",
                     msg="Port " + port + " blocked successfully on Windows",
                     duration="short",
                     icon=r'D:\Programming\Project School\Application\Frontend\pages\assets\warning.png'                 
                    )
    toastAlert5.show()



warnings.filterwarnings('ignore')
layer_2 = None
process = None
toastAlert3.show()

print("Backend Started",flush=True)
roaming_path = os.getenv('APPDATA')
app_path = os.path.join(roaming_path, 'defender.io')


# Getting folder path to save details of attacks
history_folder_path = os.path.join(app_path, 'history')

# Create the folder if it doesn't exist
if not os.path.exists(history_folder_path):
    os.makedirs(history_folder_path)
    print("Folder created successfully.")

    # Create the time.txt file inside the history folder
    time_file_path = os.path.join(history_folder_path, "time.txt")
    with open(time_file_path, "w") as time_file:
        time_file.write("None")
    print("time.txt file created successfully.")

else:
    print("Folder already exists.")

# Setting up watch dog
class MonitorFolder(FileSystemEventHandler):
        FILE_SIZE = 1000000
        print("Monitoring Started",flush=True)

        def on_created(self, event):
            print("Something created" , flush= True)
            self.checkFolderSize(event.src_path)

        # Monitoring logs file
        def on_modified(self, event):
            path = str(event.src_path)
            print("Hmnnn",flush=True) 
            if path.split('\\')[-1] == 'logs.csv':

                try:
                    df = pd.read_csv(path, error_bad_lines=False,index_col=False)
                    
                    if len(df) >= 500:
                        toastAlert4.show()

                        buffer = df
                        print("collected logs length: " + str(len(buffer.columns)))

                        print("Collected 500 logs",flush=True)
                        response = process_logs(buffer)
                        print("response from model prediction: ", response,flush=True)
                        if(response == '0'):
                            toastAlert1.show()

                        else:
                            toastAlert2.show()

                            now = datetime.now()
                            formatted_datetime = "attack " +  now.strftime("%d_%m_%Y %H_%M_%S")

                            roaming_path = os.getenv('APPDATA')
                            app_path = os.path.join(roaming_path, 'defender.io','history',formatted_datetime)
                            os.makedirs(app_path)
                            if os.path.exists(app_path):

                                layer_2.to_csv(os.path.join(app_path,'malacious_logs.csv'),index=False)
                                with open(os.path.join(app_path,'details.txt'), 'w') as file:
                                    if isinstance(response, (dict, list)):
                                        json.dump(response, file)
                                    elif isinstance(response, str):
                                        file.write(response)

                            else:
                                print("Failed to create folder.")

                        print(str(response) + " malacious logs detected",flush=True)

                except pd.errors.EmptyDataError as err:
                    pass

            self.checkFolderSize(event.src_path)

        def checkFolderSize(self, src_path):
            if os.path.isdir(src_path):
                if os.path.getsize(src_path) > self.FILE_SIZE:
                    print("Time to backup the dir")
            else:
                if os.path.getsize(src_path) > self.FILE_SIZE:
                    print("very big file")

# Communication between Frontend and Backend
async def websocket_handler(websocket, path):
    async for message in websocket:
        data = json.loads(message)

        if data['Type'] == 'StartCIC':
            path = data['path']

            # set up watchdog
            src_path = "\\".join(path.split('/'))
            print(src_path)
            monitoring_thread = threading.Thread(target=start_monitoring, args=(src_path,))
            monitoring_thread.start()
            await websocket.send("Monitoring started")
            if(collect_logs(src_path,data['interface'])):
                await websocket.send("CICFLOWMETER initialized")
            else:
                await websocket.send("Interface not detected")
    
# Starting up the monitor
def start_monitoring(src_path):
    event_handler = MonitorFolder()
    observer = Observer()
    observer.schedule(event_handler, path=src_path, recursive=True)
    observer.start()
    print("Monitoring started")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        observer.join()
        
    finally:
        if process is not None:
            process.terminate()
            print("Stopped Process due to keyboard interrupt: ", process.pid)

# Initializing CIC-Flowmeter
def collect_logs(path,interface):
    global process
    print("passed path:" + path)
    path += '/' + "logs.csv"
    path = path.split('/')
    path = '\\'.join(path)
    print("path is ready: ", path)

    try:
        command = 'cicflowmeter -i "'+ interface +'" -c "'+ path + '"'
        print("command: ", command,flush=True)
        process = subprocess.Popen(command)
        print("Started Process: ", process.pid,flush=True)
        return True
    
    except Exception as e:
        print("Error: ", e,flush=True)
        return False

# reading json file to handle file activity
def read_json_file(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

# Updating Statistics
def updateStats(attack,count):
    roaming_path = os.getenv('APPDATA')
    app_path = os.path.join(roaming_path, 'defender.io')

    # Create the folder path for "history"
    statsPath = os.path.join(app_path, 'stats.json')

    stats = read_json_file(statsPath)

    if(attack == 'Bot.pkl'):
        stats['BOT'] =  str(int(stats['BOT']) + count) 

    if(attack == 'Brute Force -XSS.pkl'):
        stats['Brute Force -XSS'] =  str(int(stats['Brute Force -XSS']) + count) 

    if(attack == 'DDOS attacts-HOIC.pkl'):
        stats['DDOS attacts-HOIC'] =  str(int(stats['DDOS attacts-HOIC']) + count) 

    if(attack == 'DDOS attacts-LOIC-UDP.pkl'):
        stats['DDOS attacts-LOIC-UDP'] =  str(int(stats['DDOS attacts-LOIC-UDP']) + count) 

    if(attack == 'DDoS attacts-LOIC-HTTP.pkl'):
        stats['DDoS attacts-LOIC-HTTP'] =  str(int(stats['DDoS attacts-LOIC-HTTP']) + count) 
    
    if(attack == 'DoS GoldenEye.pkl'):
        stats['DoS GoldenEye'] =  str(int(stats['DoS GoldenEye']) + count) 

    if(attack == 'Dos Hulk.pkl'):
        stats['Dos Hulk'] =  str(int(stats['Dos Hulk']) + count) 

    if(attack == 'DoS Slowhttptest.pkl'):
        stats['DoS Slowhttptest'] =  str(int(stats['DoS Slowhttptest']) + count) 

    if(attack == 'DoS slowloris.pkl'):
        stats['DoS slowloris'] =  str(int(stats['DoS slowloris']) + count) 

    if(attack == 'FTP-BruteForce.pkl'):
        stats['FTP-BruteForce'] =  str(int(stats['FTP-BruteForce']) + count) 

    if(attack == 'Infilteration.pkl'):
        stats['Infilteration'] =  str(int(stats['Infilteration']) + count) 

    if(attack == 'SSH-Bruteforce.pkl'):
        stats['SSH-Bruteforce'] =  str(int(stats['SSH-Bruteforce']) + count) 
    
    if(attack == 'Web Attack - Brute Force.pkl'):
        stats['Web Attack - Brute Force'] =  str(int(stats['Web Attack - Brute Force']) + count) 

    if(attack == 'ZERO DAY'):
        stats['ZERO DAY'] = str(int(stats['ZERO DAY']) + count) 

    update_json_file(statsPath,stats)

# Updating json file
def update_json_file(file_path, data):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)

# Processing the logs collected
def process_logs(df):
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
    
    print("processing: ", str(len(layer_1)))
    # Loading the model
    import pickle

    script_dir = os.path.dirname(os.path.abspath(__file__))

    print("script dir: " + script_dir, flush=True)

    # importing scalers
    min_max = pickle.load(open(os.path.join(script_dir, 'Scalers', 'scalar_min_max.pkl'), 'rb'))
    quantile = pickle.load(open(os.path.join(script_dir, 'Scalers', 'scalar_quantile.pkl'),'rb'))
    power = pickle.load(open(os.path.join(script_dir, 'Scalers', 'scalar_power.pkl'),'rb'))

    layer_1 = quantile.transform(layer_1)

    # import Layer1 model

    layer_1_model = pickle.load(open(os.path.join(script_dir, 'ML Models', 'Layer1', 'xgb_classifier.pkl'), 'rb'))


    # Use the loaded model to make predictions
    layer_1_pred = layer_1_model.predict(layer_1)

    if(len(np.unique(layer_1_pred)) == 1 and np.unique(layer_1_pred)[0] == 0):
        return "0"

    else: 
        malacious = np.where(layer_1_pred == 1)[0]

        # getting 2nd layer data from df of malacious indices
        global layer_2
        layer_2 = df[['dst_port','flow_duration', 'flow_byts_s', 'flow_pkts_s', 'fwd_pkts_s',
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

        ports = np.unique(layer_2['dst_port'].iloc[malacious])
        print("ports: ",ports,flush=True)
        roaming_path = os.getenv('APPDATA')
        app_path = os.path.join(roaming_path, 'defender.io')

        # Create the folder path for "history"
        blockedPortsPath = os.path.join(app_path, 'blockedPorts.json')

        # Load the existing blocked ports from the JSON file
        if os.path.exists(blockedPortsPath):
            with open(blockedPortsPath, 'r') as file:
                blockedPorts = json.load(file)
        else:
            blockedPorts = []


        # Blocking the ports where malacious activity is detected
        for port in ports:
            if port not in blockedPorts:
                block_port(port)
                blockedPorts.append(int(port))
                toastAlertPort(str(port))

        update_json_file(blockedPortsPath, blockedPorts)

        layer_2.drop(['dst_port'], axis=1, inplace=True)
        print(len(layer_2.columns),flush=True)
        layer_2 = layer_2.iloc[malacious]
        print(len(layer_2))

        layer2_power_tr = power.transform(layer_2)

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

            unique_value, unique_counts = np.unique(y_pred,return_counts=True)

            if(len(unique_value) == 1 and unique_value[0] == 1): # Detected all as inliers
                probable_attacks.append({
                    'attack':i['attack'].split('\\')[-1],
                    'confidence': str(round(((unique_counts[0])/len(layer_2)) * 100,2)) + '%',
                    'length': str(unique_counts[0])
                    })

                updateStats(i['attack'].split('\\')[-1],unique_counts[0])

            if(len(unique_value) == 1 and unique_value[0] == -1): # Detected all as outliers
                pass 

            if(len(unique_value) == 2):
                outlier_count = unique_counts[0]
                inlier_count = unique_counts[1]

                probable_attacks.append({
                    'attack':i['attack'].split('\\')[-1],
                    'confidence':  str(round(((inlier_count)/len(layer_2)) * 100,2)) + '%',
                    'length': str(inlier_count)
                })
                updateStats(i['attack'].split('\\')[-1],inlier_count)

        if(len(probable_attacks) == 0):
            probable_attacks.append('Zero Day Attack')
            updateStats('ZERO DAY',len(layer_2))

        print("Predicted as:",probable_attacks,flush=True)

        return probable_attacks;

# Blocking the port
def block_port(port):
    import subprocess

    check_command = f'Get-NetFirewallRule -DisplayName "Block Inbound Port {port}"'

    check_process = subprocess.Popen(['powershell', '-Command', check_command], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    check_stdout, check_stderr = check_process.communicate()

    if check_process.returncode == 0 and check_stdout.strip():
        print(f'Firewall rule for port {port} already exists. No action taken.')

    else:
        add_command = f'New-NetFirewallRule -DisplayName "Block Inbound Port {port}" -Direction Inbound -LocalPort {port} -Protocol TCP -Action Block'

        add_process = subprocess.Popen(['powershell', '-Command', add_command], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        add_stdout, add_stderr = add_process.communicate()

        if add_process.returncode == 0:
            print(f'Port {port} blocked successfully on Windows.')
        else:
            print('Error occurred while executing the command:')
            print(add_stderr.decode().strip())

        
if __name__ == '__main__':  
    print('Running',flush=True)
    start_server = websockets.serve(websocket_handler, 'localhost', 8001, max_size=1024 * 1024 * 1024)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()