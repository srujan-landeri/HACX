const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const userData = {
    name:"",
    email:""
}

ipcRenderer.on('show-notification', (event, type, message) => {
    showNotification(type, message);
  })

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidName(name) {
    if(name.length < 3) return false;
    const nameRegex = /^[a-zA-Z\s]+$/;
    return nameRegex.test(name);
}

function saveObjectToJsonFile(object, filePath) {
    const json = JSON.stringify(object, null, 2);
    
    fs.writeFile(filePath, json, 'utf8', (err) => {
      if (err) {
        console.error('Error saving JSON file:', err);
        return;
      }
      console.log('JSON file saved successfully:', filePath);
    });
  }

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
    }
}
    

function submit(){
    const name = document.getElementById('name').value;

    if(!isValidName(name)){
        showNotification('error','Enter a valid name');
        return;
    }

    userData.name = name;
    userData.email = "";
    userData.preference = false;
    
    ipcRenderer.send('get-userDataPath');

    ipcRenderer.on('userDataPath', (event, userDataPath) => {
        saveObjectToJsonFile(userData,path.join(userDataPath, 'userData.json'));
        ipcRenderer.send('loadHtmlFile','homePage.html');
    });

}