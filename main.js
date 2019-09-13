/****
 * FILE: Use this file to manage electron js execution.
 * AUTHOR: Impressico(fb/gshukla67).
 * DESCRIPTION: In this file you can include the rest of your app's specific main process.
 * DATE: 16/11/2018.
**/

//Handle setupevents as quickly as possible.
/*if (require('electron-squirrel-startup')) {
  return;
}*/

/*const setupEvents = require('./installers/setupEvents')
if (setupEvents.handleSquirrelEvent()) {
  return;
}*/

const { app, BrowserWindow, Menu, ipcMain  } = require('electron'),
electron = require('electron'),
regedit = require('regedit'),
path = require("path"),
url = require("url");

const updater = require('electron-simple-updater');

let win, deepLinkUrl, autoConfigURL

regedit.setExternalVBSLocation('resources/regedit/vbs')

const proxySetup = () => {
  regedit.list('HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', (err, result) => {

    if (err) {
      logEverywhere('Proxy Error: ', err)
      return;
    }

    if (result['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'].values['AutoConfigURL']) {
      autoConfigURL = result['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'].values['AutoConfigURL']['value']
      logEverywhere("PAC FILE PATH: "+ autoConfigURL)
      
    }
    else {
      autoConfigURL = "No-PROXY"
    }
    if(result['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'].values['ProxyServer']){
      logEverywhere("ProxyServer: "+ result['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'].values['ProxyServer']['value'])
      // app.commandLine.appendSwitch("proxy-server", result['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'].values['ProxyServer']['value'])
    }
  })
}

var sudo = require('sudo-prompt');
var options = {
name: 'Electron'
};


const startAutoupdateMac = () => {
    
    sudo.exec('chown root /Applications/panasonic.app', options,
        function(error, stdout, stderr) {
              if (error){
                //throw error;
              }
              else{
                updater.init();
                updater.on('update-available', onUpdateAvailable);
                //updater.on('update-downloading', onUpdateDownloading);
                //updater.on('update-downloaded', onUpdateDownloaded);
              }
              //console.log('stdout: ' + stdout);
        }
    );
    
    
}

function onUpdateAvailable(meta) {
    const dialogOpts = {
    type: 'info',
    buttons: ['Continue', 'Later'],
    title: 'Application Update Available',
    message: meta.readme,
    detail: 'Downloading the updated version of the application.'
    }
    
    electron.dialog.showMessageBox(dialogOpts, (res) => {
        if (res === 0) {
            updater.on('update-downloaded', onUpdateDownloaded);
        }
    })
}
/*
const startAutoUpdater = (squirrelUrl) => {
  autoUpdater.setFeedURL(`${squirrelUrl}/windows/`)
  autoUpdater.on('update-available', (event, releaseNotes, releaseName) => {
	dialog.showMessageBox({
		type: 'info',
		buttons: ['Continue', 'Later'],
		title: "Application Update Available",
		message: process.platform === 'win32' ? releaseNotes : releaseName,
		detail: 'Downloading the updated version of the application.'
	}, (res) => {
	  if (res === 0) {
		autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
			dialog.showMessageBox({
			  type: 'info',
			  buttons: ['Restart', 'Later'],
			  title: 'Application Update',
			  message: process.platform === 'win32' ? releaseNotes : releaseName,
			  detail: 'A new version has been downloaded. Restart the application to apply the updates.'
			}, (response) => {
			  if (response === 0) autoUpdater.quitAndInstall()
			})
		})
	  }
	})
  })
  autoUpdater.on('error', message => {
    // console.error(message)
  })
  // Tell squirrel to check for updates
  autoUpdater.checkForUpdates()
}
*/

/*function onUpdateDownloading() {
    electron.dialog.showMessageBox({"message": "New updates are downloading"});
}*/

function onUpdateDownloaded() {
     const dialogOpts = {
     type: 'info',
     buttons: ['Restart', 'Later'],
     title: 'Application Update',
     detail: 'A new version has been downloaded. Restart the application to apply the updates.'
     }
    
     electron.dialog.showMessageBox(dialogOpts, (response) => {
     if (response === 0) updater.quitAndInstall()
     })
 }

// Force Single Instance Application.
const shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
  if (process.platform == 'win32' || process.platform === 'linux') {
    deepLinkUrl = argv.slice(1)
  }
  logEverywhere("app.makeSingleInstance# " + deepLinkUrl)

  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})
if (shouldQuit) {
  app.quit()
  return
}

// Main Function.
createWindow = () => {
  win = new BrowserWindow({
    width: 1281,
    height: 800,
    minWidth: 1281,
    minHeight: 800,
    // backgroundColor: '#312450',
    show: true,
    icon: path.join(__dirname, 'assets/icons/png/logo.png')
  });

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'dist/hdvc/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  let intervalObj = setInterval(() => {
    if (autoConfigURL != undefined) {
      if (autoConfigURL == "No-PROXY") {
        clearInterval(intervalObj)
        return true
      }
      win.webContents.session.setProxy({pacScript: autoConfigURL}, () => {
        logEverywhere("Setup Done...")
        return true;
      })
      clearInterval(intervalObj)
    }
  }, 10)


  // Open the DevTools.
  // win.webContents.openDevTools()

  // Protocol handler for win32.
  if (process.platform == 'win32' || process.platform === 'linux') {
    deepLinkUrl = process.argv.slice(1)
    ipcMain.on("getLounchApplication", (event, arg) => {
      win.webContents.send("manageLounchApplication", deepLinkUrl[0])
    })
  }


  let mainSession = win.webContents.session
  mainSession.cookies.get({ name: 'authToken' }, (error, cookies) => {
    // console.log(cookies);
  })

  // Emitted when the window is closed.
  win.on('closed', function () {
    win = null
  })

  // Emitted when app lounch.
  Menu.setApplicationMenu(Menu.buildFromTemplate([]))
}
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

  // Add this condition to avoid error when running your application locally
  if (process.platform == 'win32') {
    proxySetup()
  }
  startAutoupdateMac()
  createWindow()
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Active when win is null.
app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

// Define custom protocol handler. Deep linking works on packaged versions of the application!
app.setAsDefaultProtocolClient('hdvc')

// Protocol handler for osx.
app.on('open-url', (event, url) => {
  event.preventDefault()
  deepLinkUrl = url
  console.log("OpenUrl: " + url)
  logEverywhere("open-url# " + deepLinkUrl)
})

// Log both at dev console and at running node console instance.
logEverywhere = (s) => {
  console.log(s)
  if (win && win.webContents) {
    win.webContents.executeJavaScript(`console.log("${s}")`)
  }
}

const handleSquirrelEvent = () => {
  if (process.argv.length === 1) {
    return false;
  }

  const squirrelEvent = process.argv[1]
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
    case '--squirrel-uninstall':
      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      app.quit();
      return true;
  }
}

if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}
/* The End. */
