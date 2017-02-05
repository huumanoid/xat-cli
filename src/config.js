'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const solReader = require('xat-client/src/utils/sol-reader')

const mkdir = (dirName) => {
  try {
    fs.mkdirSync(dirName)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e
    }
  }
}

module.exports =
class ConfigurationManager {
  constructor() {
    const home = os.homedir()
    const configDir = path.join(home, '.xatclirc')
    const configFile = path.join(configDir, 'config.js')
    const profilesPath = path.join(configDir, 'profiles')

    mkdir(configDir)
    mkdir(profilesPath)

    // let config = null

    try {
      fs.lstat(configFile)
      // config = fs.readFileSync(configFile)
    } catch (e) {
      const defaultConfig = path.join(__dirname, '../config.js')
      const configData = fs.readFileSync(defaultConfig)

      fs.writeFileSync(configFile, configData)

      // config = configData
    }

    this.paths = {
      profiles: profilesPath,
    }

    const config = require(configFile)// JSON.parse(config.toString('utf8'))
    for (const key in config) {
      this[key] = config[key]
    }

  }

  fromSol(fileName) {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, (err, data) => {
        if (err) return reject(err)
        const sol = solReader.read(data)

        this.user.todo = sol
        
        const storedName = path.join(this.paths.profiles, new Date().getTime() + '.json')
        fs.writeFile(storedName, JSON.stringify(sol), (err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    })
  }
}
