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
    this.innerProps = ['innerProps', 'fromSol', 'paths', 'save']

    const home = os.homedir()
    const configDir = path.join(home, '.xatclirc')
    const configFile = path.join(configDir, 'config.json')
    const profilesPath = path.join(configDir, 'profiles')

    mkdir(configDir)
    mkdir(profilesPath)

    let config = null
    try {
      fs.lstat(configFile)
      config = fs.readFileSync(configFile)
    } catch (e) {
      const defaultConfig = path.join(__dirname, '../config.json')
      const configData = fs.readFileSync(defaultConfig)

      fs.writeFileSync(configFile, configData)

      config = configData
    }

    this.paths = {
      profiles: profilesPath,
      configFile,
    }

    config = JSON.parse(config)
    for (const key in config) {
      this[key] = config[key]
    }

    if (this.user.todo.w_useroom == null) {
      this.user.todo.w_useroom = 1
    }
  }

  fromSol(fileName) {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, (err, data) => {
        if (err) return reject(err)
        const sol = solReader.read(data)

        for (const key in sol) {
          let clientKey = key
          if (key === 'w_k1c') {
            clientKey = 'w_k1'
          }

          let value = sol[key]
          if (typeof value === 'number') {
            value = String(value)
          }

          this.user.todo[clientKey] = value
        }

        const storedName = path.join(this.paths.profiles, new Date().getTime() + '.json')
        fs.writeFile(storedName, JSON.stringify(sol), (err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    })
  }
}
