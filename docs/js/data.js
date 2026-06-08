/**
 * GovAlign Annotator - Data Layer
 *
 * Handles:
 * - CSV loading from the docs/data/ folder (fetch + PapaParse)
 * - Batch generation (split CSV into 25-instance batches)
 * - Country/region lookup
 */

var DATA = (function() {
  var BATCH_SIZE = 25;

  // Country registry. `available: true` means the CSV file is committed.
  var COUNTRIES = {
    india: {
      key: 'india',
      name: 'India',
      file: 'data/india.csv',
      law: 'Digital Personal Data Protection Act 2023',
      available: true,
      color: '#ff9933'
    },
    china: {
      key: 'china',
      name: 'China',
      file: 'data/china.csv',
      law: 'Personal Information Protection Law (PIPL)',
      available: false,
      color: '#de2910'
    },
    saudi_arabia: {
      key: 'saudi_arabia',
      name: 'Saudi Arabia',
      file: 'data/saudi_arabia.csv',
      law: 'Personal Data Protection Law (PDPL)',
      available: false,
      color: '#006c35'
    },
    egypt: {
      key: 'egypt',
      name: 'Egypt',
      file: 'data/egypt.csv',
      law: 'Personal Data Protection Law (PDPL)',
      available: false,
      color: '#ce1126'
    },
    bulgaria: {
      key: 'bulgaria',
      name: 'Bulgaria',
      file: 'data/bulgaria.csv',
      law: 'Personal Data Protection Act',
      available: false,
      color: '#00966e'
    },
    nigeria: {
      key: 'nigeria',
      name: 'Nigeria',
      file: 'data/nigeria.csv',
      law: 'Nigeria Data Protection Regulation (NDPR)',
      available: false,
      color: '#008751'
    },
    bangladesh: {
      key: 'bangladesh',
      name: 'Bangladesh',
      file: 'data/bangladesh.csv',
      law: 'Digital Security Act 2018',
      available: false,
      color: '#006a4e'
    }
  };

  // ─────────────────────────────────────
  // CSV loading
  // ─────────────────────────────────────

  /**
   * Fetch and parse a country's CSV file.
   * Returns a Promise that resolves to an Array of instance objects.
   */
  function loadCSV(countryKey) {
    var country = COUNTRIES[countryKey];
    if (!country) return Promise.reject(new Error('Unknown country: ' + countryKey));
    if (!country.available) {
      return Promise.reject(new Error('Country not yet available: ' + country.name));
    }

    return fetch(country.file)
      .then(function(r) {
        if (!r.ok) throw new Error('Failed to load ' + country.file);
        return r.text();
      })
      .then(function(text) {
        return new Promise(function(resolve, reject) {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: function(results) {
              if (results.errors && results.errors.length) {
                console.warn('CSV parse warnings:', results.errors);
              }
              resolve(results.data);
            },
            error: function(err) {
              reject(err);
            }
          });
        });
      });
  }

  // ─────────────────────────────────────
  // Batch generation
  // ─────────────────────────────────────

  /**
   * Split a list of instances into batches of 25.
   * Each batch gets a batch_id of the form "{COUNTRY}-B{NN}".
   * Sorted by prompt_id first for deterministic ordering.
   */
  function generateBatches(instances, countryKey) {
    var country = COUNTRIES[countryKey];
    if (!country) throw new Error('Unknown country: ' + countryKey);
    var prefix = countryKey.slice(0, 3).toUpperCase();  // ind→IND, sau→SAU

    var sorted = instances.slice().sort(function(a, b) {
      return String(a.prompt_id || '').localeCompare(String(b.prompt_id || ''));
    });

    var batches = [];
    for (var i = 0; i < sorted.length; i += BATCH_SIZE) {
      var slice = sorted.slice(i, i + BATCH_SIZE);
      var num = String(batches.length + 1).padStart(2, '0');
      batches.push({
        batch_id: prefix + '-B' + num,
        country_key: countryKey,
        country_name: country.name,
        instances: slice,
        start_index: i,
        end_index: Math.min(i + BATCH_SIZE - 1, sorted.length - 1)
      });
    }
    return batches;
  }

  /**
   * For an annotator, return their assigned batches (annotated with completion).
   * `assignments` is an object: { batch_id: annotator_id }
   */
  function getAnnotatorBatches(allBatches, annotatorId, assignments) {
    if (!annotatorId) return [];
    var result = [];
    allBatches.forEach(function(b) {
      // Match by either explicit assignment OR by suffix `-{ANNOTATOR_ID}`.
      var assignedTo = (assignments && assignments[b.batch_id]) || null;
      var hasSuffix = b.batch_id.endsWith('-' + annotatorId);
      if (assignedTo === annotatorId || hasSuffix) {
        result.push(b);
      }
    });
    return result;
  }

  // ─────────────────────────────────────
  // Getters
  // ─────────────────────────────────────

  function getCountries() {
    return Object.keys(COUNTRIES).map(function(k) { return COUNTRIES[k]; });
  }

  function getCountry(key) {
    return COUNTRIES[key] || null;
  }

  function getBatchSize() {
    return BATCH_SIZE;
  }

  /**
   * Detect the BCP-47 language code for a given language label.
   * Used to set the lang attribute on prompt_text elements.
   */
  function getLangCode(language) {
    if (!language) return 'en';
    var l = String(language).toLowerCase().trim();
    var map = {
      'bengali':    'bn',
      'hindi':      'hi',
      'tamil':      'ta',
      'telugu':     'te',
      'arabic':     'ar',
      'chinese':    'zh',
      'mandarin':   'zh',
      'russian':    'ru',
      'bulgarian':  'bg',
      'english':    'en',
      'french':     'fr',
      'spanish':    'es',
      'portuguese': 'pt',
      'yoruba':     'yo',
      'hausa':      'ha',
      'igbo':       'ig'
    };
    return map[l] || l.slice(0, 2);
  }

  /**
   * RTL languages need `dir="rtl"`.
   */
  function isRTL(language) {
    if (!language) return false;
    var l = String(language).toLowerCase().trim();
    return ['arabic', 'hebrew', 'urdu', 'persian', 'farsi', 'pashto', 'sindhi'].indexOf(l) >= 0;
  }

  return {
    getCountries: getCountries,
    getCountry: getCountry,
    loadCSV: loadCSV,
    generateBatches: generateBatches,
    getAnnotatorBatches: getAnnotatorBatches,
    getBatchSize: getBatchSize,
    getLangCode: getLangCode,
    isRTL: isRTL
  };
})();