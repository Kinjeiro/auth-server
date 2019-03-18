/* eslint-disable no-undef,no-param-reassign */
import pathLib from 'path';
import forOwn from 'lodash/forOwn';
// import merge from 'lodash/merge';
import mergeWith from 'lodash/mergeWith';
import set from 'lodash/set';
import uniq from 'lodash/uniq';
import queryString from 'query-string';

function proceedDefaultValues(defaultValues) {
  const calculatedDefValues = {};
  if (defaultValues) {
    forOwn(defaultValues, (value, key) => {
      if (typeof value === 'function') {
        calculatedDefValues[key] = value();
      }
    });
  }

  return Object.keys(defaultValues).length > 0
    ? {
      ...defaultValues,
      ...calculatedDefValues,
    }
    : defaultValues;
}

/**
 *
 * @param url - либо объект location, либо мапа параметров, либо стринга
 * @param defaultValues
 * @param customNormalizersMap - мапа <filterName>: (urlValue)=>normalizedValue  - для правильного парсинга из урла
 *   значений
 * @returns {{}}
 */
export function parseUrlParameters(url, defaultValues = {}, customNormalizersMap = {}) {
  if (!url) {
    return {};
  }

  let params = url;

  if (typeof url === 'object' && url.pathname) {
    // это location
    url = url.search;
  }
  if (typeof url === 'string') {
    const extracted = queryString.extract(url);

    params = queryString.parse(
      extracted,
      {
        arrayFormat: extracted.indexOf('[]=') >= 0
          ? 'bracket'
          : undefined,
      },
    );
  }

  const defaultValuesFinal = proceedDefaultValues(defaultValues);

  /*
    Чтобы парсить объекты в query
    http://localhost:8080/api/products?type=products&meta%5Bsearch%5D&meta%5BstartPage%5D=0&meta%5BitemsPerPage%5D=10&meta%5BsortBy%5D&meta%5BsortDesc%5D=true&meta%5Btotal%5D&filters%5Btype%5D=goods
    Иначе выводится:
     meta[search]:
     meta[startPage]: 0
     meta[itemsPerPage]: 10
     meta[sortBy]:
     meta[sortDesc]: true
     meta[total]:
     filters[type]: goods
  */
  return Object.keys(params).reduce((paramsFinal, key) => {
    const value = params[key];
    const result = /^(\S+)\[(\S+)\]$/i.exec(key);
    const firstPart = result && result[1];
    const innerPart = result && result[2];
    let paramPath;
    if (innerPart) {
      if (typeof paramsFinal[firstPart] === 'undefined') {
        paramsFinal[firstPart] = {};
      }
      paramPath = `${firstPart}.${innerPart}`;
    } else {
      paramPath = key;
    }

    let valueFinal = typeof value !== 'undefined'
      ? value
      : defaultValuesFinal[paramPath];

    const normalizer = customNormalizersMap[paramPath];
    valueFinal = normalizer ? normalizer(valueFinal) : valueFinal;

    set(paramsFinal, paramPath, valueFinal);
    return paramsFinal;
  }, {});
}



function pushEncodedKeyValuePair(pairs, key, val) {
  if (val !== null && typeof val !== 'undefined') {
    if (Array.isArray(val)) {
      val.forEach((v) => {
        pushEncodedKeyValuePair(pairs, key, v);
      });
    } else if (typeof val === 'object') {
      for (const subkey in val) {
        pushEncodedKeyValuePair(pairs, `${key}[${subkey}]`, val[subkey]);
      }
    } else {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  } else if (val === null) {
    pairs.push(encodeURIComponent(key));
  }
}

/**
 * // todo @ANKU @LOW - не работают с "bracket" (когда multiple test[]=value1&test[]=value2)
 *
 * @param params
 * @param url - если '' пустая строка - то это сигнал вернуть c символом начала query параметров (знаком вопроса):
 *   ?test=testValue
 * @param hash
 * @returns {string}
 */
export function formatUrlParameters(params, url = null, hash = ''/* , useBracket = false */) {
  // const paramStr =
  //   queryString.stringify(params, { arrayFormat: useBracket ? 'bracket' : undefined })
  //   // todo @ANKU @LOW - @BUT_OUT queryString - они не кодируют # hash
  //   .replace(/#/g, '%23');
  // todo @ANKU @LOW @BUT_OUT @query-string - не умеет вложенные объекты парсить filters: { user: 'ivanovI' } to filters[user]=ivanovI
  // Поэтому взял решение у superagent
  const pairs = [];
  for (const key in params) {
    pushEncodedKeyValuePair(pairs, key, params[key]);
  }
  const paramStr = pairs.join('&');

  return `${url || ''}${url !== null && paramStr ? '?' : ''}${paramStr}${hash}`;
}

function mergerArrayMergeByValue(srcValue, newValue) {
  if (Array.isArray(srcValue) || Array.isArray(newValue)) {
    return uniq([...srcValue, ...newValue]);
  }
  return undefined;
}

export function updateLocationSearch(url, newQueryParams, fullReplace = false) {
  const params = parseUrlParameters(url);
  if (fullReplace) {
    // полностью заменит сложные объекты (к примеру, filters для таблицы)
    Object.assign(params, newQueryParams);
  } else {
    mergeWith(params, newQueryParams, mergerArrayMergeByValue);
  }
  return `?${formatUrlParameters(params)}`;
}

/**
 *
 * @param url
 * @param newQueryParams
 * @param merge - по умолчанию реплейс массивов и объектов
 * @return {string}
 */
export function updateUrl(url, newQueryParams, merge = false) {
  const searchFinal = updateLocationSearch(url, newQueryParams, !merge);
  const index = url.indexOf('?');
  return `${url.substr(0, index >= 0 ? index : undefined)}${searchFinal}`;
}
