const path = require('path')
const fs = require('fs');
const {spawn} = require('child_process')
const kill = require("tree-kill");
const sudo = require('sudo-prompt');
const { execSync } = require('child_process');

let circleEffect = null
let toggle = null
let sheildStatus = null
let interface = ''
let pythonProcess= null;
let blockedPorts = []


// Starting the backend process
const startBackend_activateSheilds=()=>{

  pythonProcess=spawn("python",["D:/Programming/Project School/Application/Backend/app.py"],{
    // detached:true,
    // stdio: 'ignore'
  });
  
  pythonProcess.stdout.on("data",(data)=>{console.log(data.toString())})
  pythonProcess.stderr.on("data",(data)=>{
    console.warn(data.toString())
    console.log('end of warning')

    if(data.toString().includes("b'Error opening adapter")){
      showNotification("error","Interface not detected. Turning off Shields")
      toggleElement(document.querySelector('.toggle'),'no problem')
    }
  })
  
  pythonProcess.on("close",()=>{console.log("python process terminateddd....")})
  
  console.log("python process started",pythonProcess.pid.toString())
  ipcRenderer.send('get-userDataPath');
  ipcRenderer.on('userDataPath', async (event,userDataPath) => {
    const fs = require('fs');
      const folderPath = path.join(userDataPath, 'python_backend_process.txt');
      fs.writeFile(folderPath, pythonProcess.pid.toString(), (err) => {
        if (err) {
          console.error('Failed to create folder:', err);
          return;
        }
        console.log('File created successfully!');
      });
  });

  pythonProcess.unref()
  setTimeout(activateShields,5000)
}

// activating the shields
function activateShields(){
  console.log("activating sheild..")
  let firstSocketRun = true;
  ipcRenderer.send('get-userDataPath')
  ipcRenderer.on('userDataPath', async (event,userDataPath) => {
    const fs = require('fs');
      const folderPath = path.join(userDataPath, 'logs_folder');

      fs.mkdir(folderPath, { recursive: true }, (err) => {
        if (err) {
          console.error('Failed to create folder:', err);
          return;
        }
        
        console.log('Folder created successfully!');

        const socket = new WebSocket('ws://localhost:8001');
        console.log("sending interface", interface)
        const data = {
          "Type":"StartCIC",
          "path":folderPath,
          "interface":interface
        };

        socket.onopen = () => {
          if(firstSocketRun){
            socket.send(JSON.stringify(data));
            console.log("Activated Shields")
            firstSocketRun = false;
          }
        }

        socket.onmessage = (event) => {
          console.log("event message =========" + event.data)

          if(event.data === "Interface detected"){
            showNotification("success","Interface Detected")
          }

          if(event.data === "Monitoring started"){
            showNotification('success',"Monitoring Started")
          }

          if(event.data === "CICFLOWMETER initialized"){
            showNotification("sccess","CICFLOWMETER initialized")
          }
          
        }
        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        }

        socket.onclose = () => {
          console.log('WebSocket connection closed');
        }

      });
  });
}

// Deactivating the shields
function deactivateShields() {
  console.log("deactivating sheild..")

  const fs = require('fs');
  const path = require('path');
  let processId = null;
  ipcRenderer.send('get-userDataPath');
  ipcRenderer.on('userDataPath', async (event,userDataPath) => {
    const fs = require('fs');
    const folderPath = path.join(userDataPath, 'python_backend_process.txt');

    fs.readFile(folderPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Failed to read file:', err);
        return;
      }
      
      processId = parseInt(data, 10);
      console.log('Process ID:', processId);
    });
  });



  setTimeout(()=>{
    console.log("trying to kill python process",processId)
    kill(processId,(something,something2)=>{console.log(something,something2)});
    pythonProcess = null;
    showNotification("success","CICFLOWMETER terminated")
  },2000)
}


// intial UI rendering
window.addEventListener('DOMContentLoaded', function() {
  toggle = document.querySelector('.toggle');
  circleEffect = document.querySelector('.sheild-toggle-section');
  var h1 = document.getElementById('shield-status');
  var img = document.querySelector('.sheild-toggle-section img');
  ipcRenderer.send('get-userPreference');
  console.log("shensejkdfnjksdbjksdbfjkdbjk")
  ipcRenderer.on('userPreference', (event, userPreference) => {
    // sheildStatus = userPreference;
    sheildStatus = userPreference; //! setting it to false manually
    if (sheildStatus === false) {
      toggle.classList.remove('on');
      toggle.classList.add('off');
      circleEffect.classList.remove('green');
      circleEffect.classList.add('red');
      h1.textContent = 'THE SHIELDS ARE DOWN';
      img.src = './assets/warning.png';
    } else {
      toggle.classList.remove('off');
      toggle.classList.add('on');
      circleEffect.classList.remove('red');
      circleEffect.classList.add('green');
      h1.textContent = 'THE SHIELDS ARE UP';
      img.src = './assets/shield.png';
    }
  });
});


// toggle ui work
let toggleEnabled = true; // Variable to track the toggle button's enable/disable state

function toggleElement(toggle,reason) {
  console.log(reason)
  if (!toggleEnabled && reason !== 'no problem') {
    showNotification('error','Toggle is disabled. Please Try in some time')
    return; // If toggle is disabled, exit the function
  }

  // checking if interface is selected before on the toggle

  let isTogglingon = toggle.classList.contains('off');

  if(interface.trim() === '' && isTogglingon){
    showNotification('error','Please select an interface before activating the shields')
    return;
  }

  toggleEnabled = false; // Disable the toggle button

  toggle.classList.toggle('on');
  toggle.classList.toggle('off');
  let h1 = document.getElementById('shield-status');
  let img = document.querySelector('.sheild-toggle-section img');

  if (toggle.classList.contains('on')) {
    console.log('on')
    circleEffect.classList.remove('red');
    circleEffect.classList.add('green');
    h1.textContent = 'THE SHIELDS ARE UP';
    img.src = './assets/shield.png';
    ipcRenderer.send('update-userPreference', true);
    startBackend_activateSheilds();
  } else {
    console.log('off')
    ipcRenderer.send('update-userPreference', false);
    deactivateShields();
    circleEffect.classList.remove('green');
    circleEffect.classList.add('red');
    h1.textContent = 'THE SHIELDS ARE DOWN';
    img.src = './assets/warning.png';
  }

  setTimeout(() => {
    toggleEnabled = true; // Enable the toggle button after 7 seconds
  }, 7000);
}

// showing in app notifications
function showNotification(type,message) {
  if(type == 'error'){
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
    <div>
        <img src="./assets/warning.png" alt="">
        <h1>Error</h1>
    </div>
    <p>${message}</p>
    `;
    document.querySelector('.App').appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  else{
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
    <div>
        <img src="./assets/success.png" alt="">
        <h1>Success</h1>
    </div>
    <p>${message}</p>
    `;
    document.querySelector('.App').appendChild(notification);
  

  // Set a timeout to remove the notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
}

ipcRenderer.on('start-background-process', (event, arg) => {
  startBackend_activateSheilds();
})

// reading and rendering graph analytics
let graphValues = null;
let chart = null;

  function readStats() {

    document.querySelector('.chart-container').style.display = 'block';
    document.querySelector('.block-ports-container').style.display = 'none';
    document.querySelector('.interface-container').style.display = 'none';
    

    const userPath = ipcRenderer.send('get-userDataPath');
    ipcRenderer.on('userDataPath', (event, userDataPath) => {
      let statsPath = path.join(userDataPath, 'stats.json');

      const labels = [
        'BOT',
        'Brute Force -XSS',
        'DDOS attacts-HOIC',
        'DDOS attacts-LOIC-UDP',
        'DDoS attacts-LOIC-HTTP',
        'DoS GoldenEye',
        'Dos Hulk',
        'DoS Slowhttptest',
        'DoS slowloris',
        'FTP-BruteForce',
        'Infilteration',
        'SSH-Bruteforce',
        'Web Attack - Brute Force',
        'ZERO DAY',
      ];
      const stats = {};

      // Initialize values to 0 for each label
      for (const label of labels) {
        stats[label] = 0;
      }

      if (!fs.existsSync(statsPath)) {
        console.log("file not there")
        // Convert the stats object to JSON
        const statsJson = JSON.stringify(stats, null, 2);

        // Write the JSON data to the file
        fs.writeFile(statsPath, statsJson, (err) => {
          if (err) {
            console.error('Error writing stats to file:', err);
          } else {
            console.log('Stats saved to file:', statsPath);
          }
        });
        graphValues = Object.values(stats);
        renderChart(graphValues);
      } else {
        // Read the contents of the JSON file
        fs.readFile(statsPath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading JSON file:', err);
            return;
          }

          try {
            // Parse the JSON data
            const jsonData = JSON.parse(data);

            // Access the JSON object
            console.log('fetched:', Object.values(jsonData));
            graphValues = Object.values(jsonData);
            renderChart(graphValues);
          } catch (err) {
            console.error('Error parsing JSON data:', err);
          }
        });
      }
    });
  }

  function renderChart(data) {
    const ctx = document.getElementById('myChart');

    // Destroy existing chart if it exists
    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'BOT',
          'Brute Force -XSS',
          'DDOS attacts-HOIC',
          'DDOS attacts-LOIC-UDP',
          'DDoS attacts-LOIC-HTTP',
          'DoS GoldenEye',
          'Dos Hulk',
          'DoS Slowhttptest',
          'DoS slowloris',
          'FTP-BruteForce',
          'Infilteration',
          'SSH-Bruteforce',
          'Web Attack - Brute Force',
          'ZERO DAY',
        ],
        datasets: [
          {
            label: '# of Attacks',
            data: data,
            borderWidth: 1,
            color:'#000'
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  // readStats();
  showInterface();

  // fetching the blocked ports
  function showBlockedPorts(){
    let el = document.querySelector('.block-ports-container');
    el.style.display = 'block';
    document.querySelector('.chart-container').style.display = 'none';
    document.querySelector('.interface-container').style.display = 'none';

    fetchBlockedPorts();
  }

  // Fetching saved inteface
  function showInterface(){
    document.querySelector('.block-ports-container').style.display = 'none';
    document.querySelector('.chart-container').style.display = 'none';
    const el = document.querySelector('.interface-container');
    el.style.display = 'block';
  }

  // creating interface.txt file in userDataPath if not exists
  function createInterfaceFile(){

    const userPath = ipcRenderer.send('get-userDataPath');
    ipcRenderer.on('userDataPath', (event, userDataPath) => {
      let interfacePath = path.join(userDataPath, 'interface.txt');
      if (!fs.existsSync(interfacePath)) {
        fs.writeFile(interfacePath, '', (err) => {
          if (err) {
            console.error('Error writing interface to file:', err);
          } else {
            console.log('interface saved to file:', interfacePath);
            interface = ''
          }
        });
      }
      else{
         // get the data from the file

          fs.readFile(interfacePath, 'utf8', (err, data) => {
            if (err) {
              console.error('Error reading interface file:', err);
              return;
            }
            try {
              // Parse the JSON data
              // const jsonData = JSON.parse(data);
              console.log('fetched:', data);
              // put the valur in the input 

              document.querySelector('.input-container input').value = data;
              interface = data;
            } catch (err) {
              console.error('Error parsing JSON data:', err);
            }
          })
      }
    });
  }

  createInterfaceFile();

  // updating interface
  function updateInterface(){

    const userPath = ipcRenderer.send('get-userDataPath');
    ipcRenderer.once('userDataPath', (event, userDataPath) => {
      let interfacePath = path.join(userDataPath, 'interface.txt');
      let interfaceData = document.querySelector('.input-container input').value;

      if(interfaceData.trim() == ''){
        showNotification('error', 'Interface cannot be empty')
        return;
      }
      fs.writeFile(interfacePath, interfaceData, (err) => {
        if (err) {
          console.error('Error writing interface to file:', err);
        } else {
          console.log('interface saved to file:', interfacePath);
          interface = interfaceData;
          showNotification('success', 'Interface updated successfully')
          document.querySelector('.input-container input').value = interfaceData;
        }
      });
    });
  }

  // unblocking the port
  function unblockport(port){
    console.log('unblock port:', port);
    // remove the port from blockedPorts array
    let index = blockedPorts.indexOf(port);
    if (index > -1) {
      blockedPorts.splice(index, 1);
    }

    // Unblock port using PowerShell on Windows
    const command = `Remove-NetFirewallRule -DisplayName 'Block Inbound Port ${port}'`;

    const sudoOptions = {
      name: 'MyNodeJSApp',
    };

    sudo.exec(`powershell -Command "${command}"`, sudoOptions, (error, stdout, stderr) => {
    if (error) {
      console.error('Error occurred while executing the command:', error);
      return;
    }

    console.log(`Port ${port} unblocked successfully on Windows.`);
    });

    // write the blockedPorts array to file

    const userPath = ipcRenderer.send('get-userDataPath');
    ipcRenderer.once('userDataPath', (event, userDataPath) => {
      let blockedPortsPath = path.join(userDataPath, 'blockedPorts.json');
      // Convert the stats object to JSON
      const blockedPortsJson = JSON.stringify(blockedPorts, null, 2);

      // Write the JSON data to the file
      fs.writeFile(blockedPortsPath, blockedPortsJson, (err) => {
        if (err) {
          console.error('Error writing blockedPorts to file:', err);
        } else {
          console.log('blockedPorts saved to file:', blockedPortsPath);
          showNotification('success', `Port ${port} unblocked successfully`)
          fetchBlockedPorts();
        }
      });
    });
  }

  // function to fetch blocked ports
  function fetchBlockedPorts(){
    // reading array of blocked ports from file

    const userPath = ipcRenderer.send('get-userDataPath');
    ipcRenderer.once('userDataPath', (event, userDataPath) => {

      let blockedPortsPath = path.join(userDataPath, 'blockedPorts.json');
      if (!fs.existsSync(blockedPortsPath)) {
        // Convert the stats object to JSON
        const blockedPortsJson = JSON.stringify(blockedPorts, null, 2);

        // Write the JSON data to the file
        fs.writeFile(blockedPortsPath, blockedPortsJson, (err) => {
          if (err) {
            console.error('Error writing blockedPorts to file:', err);
          } else {
            console.log('blockedPorts saved to file:', blockedPortsPath);
          }
        });
      } else {
        // Read the contents of the JSON file
        fs.readFile(blockedPortsPath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading JSON file:', err);
            return;
          }

          try {
            // Parse the JSON data
            const jsonData = JSON.parse(data);

            // Access the JSON object
            console.log('fetched:', jsonData);
            blockedPorts = jsonData;


            let blockHtml = ``;

            if(blockedPorts.length == 0){
              blockHtml = `<h3 class="empty-text">No ports blocked by Firewall!</h3>`
              document.querySelector('.block-ports-body').innerHTML = blockHtml;
            }

            else{
                for(let i=0; i<blockedPorts.length; i++){
    
                  blockHtml += `<div class="port-container">
                    <h1>Port ${blockedPorts[i]}</h1>
                    <button onclick="unblockport(${blockedPorts[i]})">Unblock</button>
                  </div>`
                }
              
                
                blockHtml += `
                <div class="block-ports-footer" style="display: flex;align-items: center;width:350px;margin-inline:auto;margin-top:20px;">
                  <img src="./assets/warning.png" style="width: 40px;" alt="">
                  <p style="color:rgb(43, 42, 42);">These are ports blocked by Firewall</p>
                </div>
              `;
                document.querySelector('.block-ports-body').innerHTML = blockHtml;
              console.log(document.querySelector('.block-ports-container'))
            }

            console.log('blockedPorts:', blockedPorts);

          } catch (err) {
            console.error('Error parsing JSON data:', err);
          }
        });
      }
    });
  }

  fetchBlockedPorts();
