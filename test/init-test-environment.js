import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import dirtyChai from 'dirty-chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import server from '../src/server';

// отключаем отчеты что сертификат не проверенный
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// ======================================================
// Mocha / Chai
// ======================================================
// Тестим через expect чтобы не загрязнять Object.prototype дополнительными should конструкциями
// chai.should();

// ======================================================
// Chai Plugins
// ======================================================
chai.use(dirtyChai);
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(chaiHttp);

// ======================================================
// Globals
// ======================================================
global.chai = chai;
global.expect = chai.expect;
global.sinon = sinon;
/*
 @NOTE: добавим в глобальные переменные инстанс, чтобы не получать его каждый раз + в концу можно сделать server.close.
 Хотя мока сама это уже делает, но пусть будет.
 */
console.log('INIT test server', !!server);
global.server = server;
