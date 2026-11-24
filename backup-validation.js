/* OVERLOAD backup validation. Keep legacy APEX/CORV exports compatible. */
(() => {
  'use strict';
  const CORE_ARRAYS = ['workouts', 'foods', 'measurements'];
  const OPTIONAL_ARRAYS = ['recoveries', 'routines', 'cardio'];
  const MAX_RECORDS_PER_COLLECTION = 50000;
  const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
  function validateBackup(value) {
    if (!isRecord(value)) return { valid: false, error: 'The selected file is not a valid OVERLOAD backup.' };
    if (value.app && !['OVERLOAD', 'APEX', 'CORV'].includes(String(value.app).toUpperCase())) {
      return { valid: false, error: 'This file does not appear to be an OVERLOAD backup.' };
    }
    if (value.schemaVersion !== undefined && (!Number.isInteger(value.schemaVersion) || value.schemaVersion !== 1)) {
      return { valid: false, error: 'This backup uses an unsupported schema version. Your current records have not been changed.' };
    }
    for (const key of CORE_ARRAYS) {
      if (!Array.isArray(value[key]) || value[key].length > MAX_RECORDS_PER_COLLECTION || value[key].some(item => !isRecord(item))) {
        return { valid: false, error: 'Backup is missing valid ' + key + ' records or exceeds the supported record limit.' };
      }
    }
    for (const key of OPTIONAL_ARRAYS) {
      if (value[key] !== undefined && (!Array.isArray(value[key]) || value[key].length > MAX_RECORDS_PER_COLLECTION || value[key].some(item => !isRecord(item)))) {
        return { valid: false, error: 'Backup contains invalid ' + key + ' records or exceeds the supported record limit.' };
      }
    }
    if (value.settings !== undefined && !isRecord(value.settings)) return { valid: false, error: 'Backup settings are invalid.' };
    if (value.current !== undefined && !isRecord(value.current)) return { valid: false, error: 'Backup current workout is invalid.' };
    return { valid: true, error: '' };
  }
  window.OverloadBackup = Object.freeze({ validateBackup });
})();
