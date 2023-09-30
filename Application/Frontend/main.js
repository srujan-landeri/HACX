const { app, BrowserWindow,ipcMain, Tray, Menu, webContents } = require('electron')
const path = require('path')
const fs = require('fs');
const { exec } = require('child_process');
let mainWindow = null;
let tray;

// Check if application is opened with admin privileges
if (process.platform == "win32") {
  console.log("running on windows");

  exec("NET SESSION", function (err, so, se) {
    let is_admin = se.length === 0 ? "admin" : "not admin";
    console.log(is_admin);
    if (is_admin == "not admin") {
      console.log("please start application with admin rights, exiting..");
      // exec("exit");
      app.quit();
    }
  });

} else if (process.platform == "darwin") {
  console.log("running on mac");
  exec("NET SESSION", function (err, so, se) {
    let is_admin = se.length === 0 ? "admin" : "not admin";
    console.log(is_admin);
    if (is_admin == "not admin") {
      console.log("please start application with admin rights, exiting..");
      // exec("exit");
      app.quit();
    }
  });
} else {
  console.log("platform not supported, exiting..");
  // exec("exit");
  app.quit();
}


// Fetch the user data path
ipcMain.on('get-userDataPath', (event) => {
  const userDataPath = app.getPath('userData');
  event.sender.send('userDataPath', userDataPath);
});

// Fetch the attack folders path
ipcMain.on('get-userDataPathForFolders', (event) => {
  const userDataPath = app.getPath('userData');
  event.sender.send('userDataPathForFolders', userDataPath);
});

// Loading html file
ipcMain.on('loadHtmlFile',(event,args) => { 
  mainWindow.loadFile(path.join(__dirname,'/pages/'+args));
})

// fetching user details
ipcMain.on('get-userName', (event, args) => {
  const userDataPath = app.getPath('userData');
  const markerPath = path.join(userDataPath, 'userData.json');
  
  if (fs.existsSync(markerPath)) {
    const jsonData = fs.readFileSync(markerPath).toString();
    
    if (jsonData.trim() === '') {
      mainWindow.webContents.send('show-notification','error',"User data not found. Please enter the details in the login page");
      mainWindow.loadFile('./pages/loginPage.html');
      return;
    }
    
    const data = JSON.parse(jsonData);
    event.sender.send('userName', data.name);
  } else {
    mainWindow.webContents.send('show-notification','error',"User data not found. Please enter the details in the login page");
    mainWindow.loadFile('./pages/loginPage.html');
  }
});

// updating the shield status
ipcMain.on('update-userPreference',(event,args)=>{
  const userDataPath = app.getPath('userData');
  const markerPath = path.join(userDataPath, 'userData.json');
  if(fs.existsSync(markerPath)){
    const data = fs.readFileSync(markerPath);
    const userData = JSON.parse(data);
    userData.preference = args;

    const json = JSON.stringify(userData, null, 2);
    fs.writeFile(markerPath, json, 'utf8', (err) => {
      if (err) {
        mainWindow.webContents.send('show-notification','error',"Please ensure the file exists and is writable and Restart the app");
      }
    });
  }});

// Fetching Status on system boot up
ipcMain.on('get-userPreference',(event,args)=>{
  const userDataPath = app.getPath('userData');
  const markerPath = path.join(userDataPath, 'userData.json');
  if(fs.existsSync(markerPath)){

    const jsonData = fs.readFileSync(markerPath).toString();
    
    if (jsonData.trim() === '') {
      mainWindow.webContents.send('show-notification','error',"User data not found. Please enter the details in the login page");
      mainWindow.loadFile('./pages/loginPage.html');
      return;
    }

    const userData = JSON.parse(jsonData);
    event.sender.send('userPreference',userData.preference);
  }
  else{
    event.sender.send('userPreference',false);
  }
})

// Checking if Application is running for the first time
function isFirstRun() {
    const userDataPath = app.getPath('userData');
    const markerPath = path.join(userDataPath, 'userData.json');
  
    if (fs.existsSync(markerPath)) {
        return false;
    } return true;
}

// Creating new electron js window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1436,
    height: 814,
    icon: path.join(__dirname, '/pages/assets/favicon.png'),
    resizable:false,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        contentSecurityPolicy: "default-src 'self' file: 'unsafe-inline'",
    }
  })

  if(isFirstRun()){
    mainWindow.loadFile('./pages/loginPage.html')
  }
  else{
    mainWindow.loadFile('./pages/homePage.html')
  }

  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('close', (event) => {
    let userPreference = null;

    const userDataPath = app.getPath('userData');
    const markerPath = path.join(userDataPath, 'userData.json');
    if(fs.existsSync(markerPath)){

      const jsonData = fs.readFileSync(markerPath).toString();
      
      if (jsonData.trim() === '') {
        mainWindow.webContents.send('show-notification','error',"User data not found. Please enter the details in the login page");
        mainWindow.loadFile('./pages/loginPage.html');
        return;
      }

      const userData = JSON.parse(jsonData);
      userPreference = userData.preference;
      }

      if(userPreference === true){
        // Prevent the default close behavior
        event.preventDefault();
        mainWindow.setSkipTaskbar(true);
        // Minimize the window instead
        mainWindow.minimize();
      }
      else{
        app.quit();
      }
  });
}


// Making application run in background
function createTray() {
  tray = new Tray(path.join(__dirname, '/pages/assets/favicon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        mainWindow.webContents.send('checkForFolders')
        mainWindow.show();
        mainWindow.setSkipTaskbar(false);
      }
    }
  ]);
  tray.setToolTip('defender.io');
  tray.setContextMenu(contextMenu);

  tray.on('click', (event,bounds) => {
    mainWindow.show();
    mainWindow.setSkipTaskbar(false);
    mainWindow.webContents.send('checkForFolders')
  });
}

app.whenReady().then(() => {
  createWindow()
  createTray();
  setTimeout(() => {
    mainWindow.webContents.send('checkForFolders');
    }, 2000);
    
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Enabling application to start at boot up
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe'),
  args: ['--windows-startup'],
});


app.on('ready', () => {
  setTimeout(() => {
      if (process.argv.includes('--windows-startup')) {
        const fs = require('fs');
        
        const userDataPath = app.getPath('userData');
        const markerPath = path.join(userDataPath, 'userData.json');
        if(fs.existsSync(markerPath)){
    
          const jsonData = fs.readFileSync(markerPath).toString();
          
          if (jsonData.trim() === '') {
            mainWindow.webContents.send('show-notification','error',"User data not found. Please enter the details in the login page");
            mainWindow.loadFile('./pages/loginPage.html');
            return;
          }
    
          const userData = JSON.parse(jsonData);
          userPreference = userData.preference;
    
          if(userPreference === true){
            // initiate the background process
            mainWindow.webContents.send('start-background-process')
            mainWindow.minimize();
            mainWindow.setSkipTaskbar(true);
          }
          else{
            app.quit();
          }
      }
    }
  },5000)
  
});