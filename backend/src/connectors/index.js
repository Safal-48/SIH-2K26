import { BaseConnector, CONNECTOR_TYPES } from './baseConnector.js';
import educationConnector, { EducationConnector } from './educationConnector.js';
import incomeConnector, { IncomeConnector } from './incomeConnector.js';
import bankConnector, { BankConnector } from './bankConnector.js';
import legacyConnector, { LegacyConnector } from './legacyConnector.js';

/**
 * Departmental Connector Registry
 * Provides a unified dispatch mechanism for all departmental adapters.
 */
export const connectorRegistry = {
  education: educationConnector,
  income: incomeConnector,
  bank: bankConnector,
  bankDbt: bankConnector, // Alias
  legacy: legacyConnector,

  /**
   * Helper to retrieve connector by department code
   * @param {string} code - Department code (EDU, REV, DBT, LEG)
   */
  getByDepartmentCode(code) {
    const normalized = (code || '').toUpperCase();
    switch (normalized) {
      case 'EDU':
      case 'EDUCATION':
        return educationConnector;
      case 'REV':
      case 'INCOME':
      case 'REVENUE':
        return incomeConnector;
      case 'DBT':
      case 'BANK':
        return bankConnector;
      case 'LEG':
      case 'LEGACY':
        return legacyConnector;
      default:
        return null;
    }
  },
};

export {
  BaseConnector,
  CONNECTOR_TYPES,
  educationConnector,
  EducationConnector,
  incomeConnector,
  IncomeConnector,
  bankConnector,
  BankConnector,
  legacyConnector,
  LegacyConnector,
};

export default connectorRegistry;
