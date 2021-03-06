const fs = require('fs')

module.exports = exports = class App {
  constructor(path) {
    this.path = path

    this.numberOfLines = 0
    this.numberOfWords = 0
    this.numberOfCharacters = 0

    this.characters = {}
    this.words = {}
    this.punctuation = {}
    this.pairs = {}
    this.alphanumericPairs = {}
    this.triplets = {}
    this.alphanumericTriplets = {}
  }

  loadLanguage(name) {
    if (this.startedAt === undefined) {
      this.startedAt = new Date().getTime()
    }
    console.log(`Loading language '${name}'...`)
    const path = this.path + '/' + name
    const projects = fs.readdirSync(path)
    if (projects) {
      projects.forEach(project => this.loadProject(path, project))
    }
  }

  showStats() {
    const elapsed = Math.round((new Date().getTime() - this.startedAt) / 100) / 10
    console.log(`Finished in ${elapsed} seconds`)
    console.log(`  Lines: ${this.numberOfLines}`)
    console.log(`  Words: ${this.numberOfWords}`)
    console.log(`  Characters: ${this.numberOfCharacters}`)
  }

  loadProject(path, name = false) {
    if (name) {
      path = path + '/' + name
    }
    const start = new Date().getTime()
    if (!fs.lstatSync(path).isDirectory()) {
      console.log(`  Ignoring '${path}': not a directory`)
      return
    }
    const files = fs.readdirSync(path)
    if (files) {
      files.forEach(file => this.loadFile(path, file))
    }
    const elapsed = Math.round((new Date().getTime() - start) / 10) / 100
    console.log(`  Processed '${path}' in ${elapsed} seconds`)
  }

  loadFile(path, name) {
    path = path + '/' + name
    const stats = fs.statSync(path)
    if (stats.isFile()) {
      let lines = fs.readFileSync(path, { encoding: 'utf8' })
      if (lines) {
        this.processFile(lines)
      }
    } else {
      this.loadProject(path)
    }
  }

  processFile(contents) {
    const lines = contents.split('\n')
    lines.forEach(line => {
      this.processLine(line)
    })
  }

  processLine(line) {
    this.numberOfLines++
    this.numberOfCharacters += line.length

    // Compact all sequences of whitespace into a single space character
    line = line.replace(/\s+/g, ' ')

    // Remove all leading whitespace
    line = line.replace(/^\s+/, '')

    this.countCharacters(line)

    line.split(' ').forEach(sequence => {
      this.countWords(sequence)
      this.countPunctuation(sequence)
      this.countPairs(sequence)
      this.countTriplets(sequence)
    })
  }

  countCharacters(sequence) {
    sequence.split('').forEach(character => this.countCharacter(character))
  }

  countCharacter(character) {
    character = String(character)
    if (this.characters[character] === undefined) {
      this.characters[character] = { key: character, value: 1 }
    } else {
      this.characters[character]['value']++
    }
  }

  countWords(sequence) {
    const words = sequence.match(/[A-Za-z0-9]+/g)
    if (words) {
      words.forEach(word => {
        // Skip single letter 'words', numbers are okay
        if (word.length > 1) {
          this.numberOfWords++
          word = String(word)
          if (this.words[word] === undefined) {
            this.words[word] = { key: word, value: 1 }
          } else {
            this.words[word]['value']++
          }
        }
      })
    }
  }

  countPunctuation(sequence) {
    const punctuations = sequence.match(/[^A-Za-z0-9]+/g)
    if (punctuations) {
      punctuations.forEach(punctuation => {
        punctuation = String(punctuation)
        if (this.punctuation[punctuation] === undefined) {
          this.punctuation[punctuation] = { key: punctuation, value: 1 }
        } else {
          this.punctuation[punctuation]['value']++
        }
      })
    }
  }

  countPairs(sequence) {
    this.countSequence(sequence, 2, 'pairs')
  }

  countTriplets(sequence) {
    this.countSequence(sequence, 3, 'triplets')
  }

  countSequence(sequence, ofLength, repository) {
    const numberOfSequences = sequence.length - (ofLength - 1)
    for (let position = 0; position < numberOfSequences; position++) {
      const section = String(sequence.substring(position, position + ofLength))
      if (this[repository][section] === undefined) {
        this[repository][section] = { key: section, value: 1 }
      } else {
        this[repository][section]['value']++
      }
    }
  }

  /*
  Takes an input object in the form

  {
    key: { key, value },
    anotherKey: { anotherKey, value }
  }

  And returns an array of { key, value }-pairs ordered by value
  */
  convertAndSort(input) {
    const output = []
    // Convert input object to array
    for (const key in input) {
      output.push(input[key])
    }
    // Sort descending by .value
    output.sort(function(a, b) {
      return b.value - a.value
    })
    return output
  }

  writeResultsToDisk() {
    this.writePairs()
    this.writeTriplets()
    this.writeWords()
    this.writePunctuation()
    this.writeCharacters()
  }

  writePairs() {
    this.writeSequences('pairs')
  }

  writeTriplets() {
    this.writeSequences('triplets')
  }

  writeSequences(repository) {
    const data = this.convertAndSort(this[repository])
    this.createDefaultReport(data, `./results/${repository}`)

    const alphanumerics = data.filter(function(element) {
      return element.key.match(/^[A-Za-z0-9]+$/)
    })
    this.createDefaultReport(alphanumerics, `./results/${repository}_alphanumerics`)

    const combinations = data.filter(function(element) {
      return element.key.match(/[A-Za-z0-9]/) && element.key.match(/[^A-Za-z0-9]/)
    })
    this.createDefaultReport(combinations, `./results/${repository}_combinations`)
  }

  writeWords() {
    const data = this.convertAndSort(this.words)
    this.createDefaultReport(data, './results/words')
  }

  writePunctuation() {
    const data = this.convertAndSort(this.punctuation)
    this.createDefaultReport(data, './results/punctuation')
  }

  writeCharacters() {
    const data = this.convertAndSort(this.characters)
    this.createDefaultReport(data, './results/characters')
  }

  createDefaultReport(data, filename) {
    filename += '.txt'
    const total = this.countTotal(data)
    let limit = data[0].value / 10
    let output = ''
    let cumulative = 0
    let percentage
    data.forEach(item => {
      if (item.value < limit) {
        output += '----------\n'
        limit /= 10
      }
      cumulative += parseInt(item.value)
      percentage = Math.round((cumulative / total) * 100000) / 100000
      output += `${item.key} ${item.value} ${percentage}\n`
    })
    console.log(`Writing ${output.length} bytes to '${filename}'`)
    fs.writeFileSync(filename, output)
  }

  onFileWriteErrorHandler(error) {
    console.error('WRITE ERROR', error)
  }

  countTotal(data) {
    return data.reduce(function(prev, curr) {
      return parseInt(prev) + parseInt(curr.value)
    }, 0)
  }
}
