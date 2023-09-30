const { ipcRenderer, contentTracing } = require("electron");
const WebSocket = require('ws');
const { exec } = require('child_process');
const { shell } = require('electron');

const uploadContainer = document.querySelector('.upload-container');
const help = document.querySelector('.help')
const fileInput = document.querySelector('#file-input');
let inputEnabled = true;

let upload_pythonProcess= null;


const startBackend_uploadFile=(fileContent, filename)=>{
  const containerDiv = document.querySelector(".file-info");
      containerDiv.innerHTML =  `<span id="uploading-text">Initializing backend</span></span>
      <div class="loader">
          <span class="loader-text"></span>
          <span class="load"></span>
      </div>`
  upload_pythonProcess=spawn("python",["D:/Programming/Project School/Application/Backend/upload_app.py"]);
  
  upload_pythonProcess.stdout.on("data",(data)=>{console.log(data.toString())})
  upload_pythonProcess.stderr.on("data",(data)=>{console.warn(data.toString())})
  
  upload_pythonProcess.on("close",()=>{console.log("python process terminateddd....")})
  
  console.log("python process started",upload_pythonProcess.pid)
  setTimeout(() => {
    sendFileToPython(fileContent,filename);  // Pass the arguments here
  }, 5000);
  
}


// setting up the username
ipcRenderer.send('get-userName');
ipcRenderer.on('userName', (event, userName) => {
  document.getElementById('user-name').innerText = userName;
})

// triggering showNotification
ipcRenderer.on('show-notification', (event, type, message) => {
  showNotification(type, message);
})

// Loading back to login page
function openLogin(){
  ipcRenderer.send('loadHtmlFile','loginPage.html');
}

// switching between the tabs
function changeTab(evt){
    document.querySelector('.welcome-section').style.display = 'none';
    document.querySelector('#upload').classList.remove('active');
    document.querySelector('#shield').classList.remove('active');
    document.querySelector('#docs').classList.remove('active');

    document.querySelector('.upload-section').classList.add('display-none');
    document.querySelector('.shield-section').classList.add('display-none');
    document.querySelector('.docs-section').classList.add('display-none');

    evt.classList.add('active');

    if(evt.id == 'upload'){
      document.querySelector('.upload-section').classList.remove('display-none');
      document.querySelector('.upload-section').style.display = 'flex';
    }
    else if(evt.id == 'shield'){
      document.querySelector('.shield-section').classList.remove('display-none');
    }
    else{
      document.querySelector('.docs-section').classList.remove('display-none');
      document.querySelector('#section3').classList.remove('display-none');
      document.querySelector('.docs-sidebar').classList.remove('display-none');
    }
}


// function to toast in-app notification
const notification = document.createElement('div');
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
    notification.classList.add('notification');
    notification.innerHTML = `
    <div>
        <img src="./assets/success.png" alt="">
        <h1>Success</h1>
    </div>
    <p>${message}</p>
    `;
    document.querySelector('.App').appendChild(notification);
  }
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// help card
function closehelp(){
  document.querySelector('.help-card').style.display = 'none';
}

help.addEventListener('click',() => {
  document.querySelector('.help-card').style.display = 'flex';
})

// drag and drop feature for file upload
uploadContainer.addEventListener('dragenter', (e) => {
  e.preventDefault();
  uploadContainer.classList.add('dragged');
  e.stopPropagation();
});

uploadContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadContainer.classList.add('dragged');

  e.stopPropagation();
});

uploadContainer.addEventListener('dragleave', (e) => {
  e.preventDefault();
  uploadContainer.classList.remove('dragged');
  e.stopPropagation();
});

uploadContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  uploadContainer.classList.remove('dragged');
  if(!inputEnabled){
    showNotification('error','A file is already being processed')
  }
  inputEnabled = false
  fileInput.disabled = true
  const files = e.dataTransfer.files;
  console.log(files)
  if(files.length > 1){
    showNotification('error','You can only upload one file at a time');
    return;
  }
  handleFileUpload(files);
});

// Validating Files
const handleFileUpload = (files) => {
  if (files.length > 1 || files[0].size > 1024 * 1024 * 1024) {
    showNotification('error', 'Error uploading the file');
  } else {
    const file = files[0];
    if (file.type !== 'text/csv') {
      showNotification('error', 'Only CSV files are allowed');
      return;
    }
    readFileContent(file);
  }
};

// reading the file
function readFileContent(file) {
  const reader = new FileReader();
  
  reader.onload = function (e) {
    const fileContent = e.target.result;
    startBackend_uploadFile(fileContent,file.name);
  };

  reader.readAsText(file);
}

// sending file to backend
function sendFileToPython(fileContent,filename) {
  console.log("Sending: ",filename)
  const socket = new WebSocket('ws://localhost:8002');
  const data = {
    "Type": "File",
    "Data": fileContent
  };

  socket.onopen = () => {
    socket.send(JSON.stringify(data));
  };

  socket.onmessage = (event) => {
    let message = event.data;

    if(message === "\"error\""){
      showNotification('error','Enter a valid CIC flowmeter generated file..')
      setTimeout(()=>{
        console.log("trying to kill python process",upload_pythonProcess.pid)
        kill(upload_pythonProcess.pid,(something,something2)=>{console.log(something,something2)});
        upload_pythonProcess = null;
        inputEnabled=true;
        fileInput.disabled = false;
        showNotification('error','Backend is Closed due to error')
        
        const img = document.querySelector(".upload-container img");
        const text = document.querySelector(".upload-container span");
        img.src = "./assets/menu1.png";
        text.innerHTML = "Upload File";
        document.querySelector(".file-info").innerHTML = `<span style="color:red;font-weight:500;">Error Occured While Processing</span>`
        return;
      },2000)
    }

    else if(message == 'File received'){
      showNotification('success', 'File sent to the backend');
      const img = document.querySelector(".upload-container img");
      const text = document.querySelector(".upload-container span");
      img.src = "./assets/success.png";
      text.innerHTML = "File uploaded successfully";
      const containerDiv = document.querySelector(".file-info");
      containerDiv.innerHTML =  `<span id="uploading-text">File Uploaded: <span>${filename}</span></span>
      <div class="loader">
          <span class="loader-text">Checking for logs</span>
          <span class="load"></span>
      </div>`

      document.querySelector('.loader').style.width = 300 + 'px';
      uploadSuccess(filename);
    }
    
    else{
      message = JSON.parse(message);
  
      showNotification('sucess', 'File is processed')
      fileProcessed(filename,message);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };
}

// processing the results from backend
function fileProcessed(filename,detectedArray){
  const img = document.querySelector(".upload-container img");
  const text = document.querySelector(".upload-container span");

  img.src = "./assets/menu1.png";
  text.innerHTML = "Upload File";

   setTimeout(()=>{
    console.log("trying to kill python process",upload_pythonProcess.pid)
    kill(upload_pythonProcess.pid,(something,something2)=>{console.log(something,something2)});
    upload_pythonProcess = null;
    inputEnabled=true;
    fileInput.disabled = false;
    showNotification('Success','Backend is Closed')
  },2000)

  if(detectedArray.length == 0){
    const containerDiv = document.querySelector(".file-info");
    containerDiv.innerHTML = `<span id="uploading-text">File Uploaded: <span>${filename}</span></span>
    <p> <span>0</span> Malacius logs detected</p>`
  }

  console.log("checking zero day")
  console.log(detectedArray.length +" " +  detectedArray.length)
  if(detectedArray.length === 1 && detectedArray[0] === 'Zero Day Attack'){
    const containerDiv = document.querySelector(".file-info");
    containerDiv.innerHTML = `<span id="uploading-text">File Uploaded: <span>${filename}</span></span>
    <p style="color:red;font-weight:500;"> Probable ZERO DAY ATTACK</p>`
  }

  else if(detectedArray.length === 1 && detectedArray[0] === '0'){
    const containerDiv = document.querySelector(".file-info");
    containerDiv.innerHTML = `<span id="uploading-text">File Uploaded: <span>${filename}</span></span>
    <p><span>0</span> Malacious Logs Detected</p>`
  }

  else{
    let fileInfoContainer = document.querySelector('.file-info');
    let fileInfoText = `<span id="uploading-text">File Uploaded: <span>${filename}</span></span>`
    for(let i = 0; i < detectedArray.length; i++){
      fileInfoText += `<div class = "attack-details">
                          <span class = "span-heading">Detected: <span>${detectedArray[i].attack.replace(/_/g, ' ').replace('.pkl', '')+ " attack"}</span></span>
                          <span class = "span-heading">Confidence: <span>${detectedArray[i].confidence}%</span></span>
                      </div>`
    }
  
    fileInfoContainer.innerHTML = fileInfoText
  }
}


// Opening the folder where details of the files saved 
function openFolder(folderPath) {
  exec(`start "" "${folderPath}"`, (error, stdout, stderr) => {
      if (error) {
          console.error(`Error opening folder: ${error}`);
      } else {
          console.log(`Folder opened: ${folderPath}`);
      }
  });
}

// checking for new notifications
ipcRenderer.on('checkForFolders', (event) => {
  ipcRenderer.send('get-userDataPathForFolders');
});

// Rendering the notifications in application
ipcRenderer.on('userDataPathForFolders', (event, userDataPath) => {
  const path = require('path')
  const fs = require('fs')
  const time_path = path.join(userDataPath, 'history', 'time.txt');

  if (fs.existsSync(time_path)) {
    const time = fs.readFileSync(time_path, 'utf8');
    console.log(time);

    const historyPath = path.join(userDataPath, 'history');
    const files = fs.readdirSync(historyPath);
    const folders = files.filter((file) => {
      return fs.statSync(path.join(historyPath, file)).isDirectory();
    });

    folders.sort((a, b) => b.localeCompare(a));
    console.log(folders);

    // if (time == "None") {
      let i = 0
      let html = ``

      while(time != folders[i] && i < folders.length){
        // console.log("Displaying all folders:");
        // folders.forEach((folder) => {
          let folder_path = path.join(historyPath, folders[i]);
          let escaped_folder_path = folder_path.replace(/\\/g, '\\\\'); // Escape backslashes in folder path

          html += `
            <li class = 'notification-list'>
                <img src="./assets/warning.png" alt="">
                <div>
                    <p>Alert! Attack detected</p>
                    <div onclick="openFolder('${escaped_folder_path}')">
                        <img src="./assets/folder.png" alt="">
                        <span>View Details</span>
                        <span style="margin-left: auto;">${folders[i].split(' ')[2].replace(/_/g, ':').substring(0, 5)}</span>
                    </div>
                </div>
            </li>
          `
          i++;
        // });
      }

      if(i != 0){
        document.querySelector('.notification-badge').classList.remove('display-none')
        document.getElementById('notification-container').innerHTML = html

        fs.writeFile(time_path, folders[0], 'utf8', (err) => {
          if (err) {
            console.error('Error writing to file:', err);
            return;
          }
          console.log('Data written to file successfully.');
        });
      }
      
      else{
        document.querySelector('.notification-badge').classList.add('display-none')
        document.getElementById('notification-container').innerHTML = `
         <li style="color: white;margin:10px 20px">NO NEW NOTIFICATIONS!!</li>
         `
      }
  } else {
    console.log('time.txt file does not exist.');
  }
});

// rendering upload text
function uploadSuccess(filename) {
  const containerDiv = document.querySelector(".file-info");
  containerDiv.innerHTML =  `<span id="uploading-text">File Uploaded: <span>${filename}</span></span>
  <div class="loader">
      <span class="loader-text">Checking for logs</span>
      <span class="load"></span>
  </div>`

  document.querySelector('.loader').style.width = document.querySelector('#uploading-text').offsetWidth + 'px';
}

// UI work
function toggleNotifications(){
  const notificationCard = document.querySelector('.notifications-card');
  notificationCard.classList.toggle('hide');
  document.querySelector('.card-pointer').classList.toggle('hide');
  const settingsCard = document.getElementById('settings-card');
  const settingsIcon = document.getElementById('settings-icon');
  document.querySelector('.notification-badge').classList.add('display-none')
  settingsCard.classList.add('hide');
}

function toggleSettings() {
  const settingsCard = document.getElementById('settings-card');
  const settingsIcon = document.getElementById('settings-icon');
  
  const notificationCard = document.querySelector('.notifications-card');
  notificationCard.classList.add('hide');
  document.querySelector('.card-pointer').classList.add('hide');
  settingsCard.classList.toggle('hide');
  settingsIcon.classList.toggle('rotate');
}

// adding eventlistener for file input
fileInput.addEventListener('change', (e) => { // Add this event listener
  if(!inputEnabled){
    showNotification('error','A file is already being processed')
  }
  inputEnabled = false
  fileInput.disabled = true;
  const files = e.target.files;
  handleFileUpload(files);
});

// opening website in browser
const link = document.getElementById('gitlink');

link.addEventListener('click', (event) => {
  event.preventDefault(); // Prevent the default link behavior

  const href = link.getAttribute('href');
  shell.openExternal(href); // Open the link in the user's default browser
});
