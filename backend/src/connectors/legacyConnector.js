import BaseConnector, { CONNECTOR_TYPES } from './baseConnector.js';
import logger from '../utils/logger.js';

/**
 * Legacy Systems Connector Module
 * Simulates adapting an archaic state archive mainframe (SOAP/XML & pipe-delimited legacy streams)
 * into the modern canonical interoperability model without touching a real legacy system.
 */
export class LegacyConnector extends BaseConnector {
  constructor(options = {}) {
    super('LEG', 'Legacy Government Systems Gateway', {
      connectorType: CONNECTOR_TYPES.LEGACY,
      ...options,
    });
  }

  /**
   * Build legacy protocol envelope
   */
  buildPayload(canonicalRequest = {}) {
    return {
      record_key: canonicalRequest.record_key || canonicalRequest.recordKey || 'LEG-ARCHIVE-9001',
      citizen_id: canonicalRequest.citizen_id || canonicalRequest.citizenId || 'CZN-1001',
      request_origin: 'CANONICAL_INTEROP_GRID',
    };
  }

  /**
   * Normalize simulated legacy mainframe record into canonical format
   */
  normalizeResponse(raw = {}, canonicalRequest = {}) {
    const legacyRec = raw.SOAP_BODY?.LEGACY_RECORD || raw;
    const isConfirmed = legacyRec.DOC_STATUS === 'VALID_CONFIRMED';

    return {
      status: isConfirmed ? 'VERIFIED' : 'REJECTED',
      record_key: legacyRec.REC_KEY || canonicalRequest.record_key || 'LEG-ARCHIVE-9001',
      citizen_id: legacyRec.CITIZEN_REF || canonicalRequest.citizen_id,
      originating_system: legacyRec.SYS_ORIGIN || 'STATE_CENTRAL_ARCHIVE_1998',
      legacy_protocol: 'SOAP_EMULATED',
      is_legacy_verified: isConfirmed,
      registration_year: parseInt(legacyRec.ISSUED_YEAR || '2021', 10),
      legacy_flags: (legacyRec.METADATA_FLAGS || 'FLAG_VERIFIED').split('|'),
      adapted_at: new Date().toISOString(),
    };
  }

  /**
   * Simulated legacy protocol adapter execution
   */
  async executeLegacy(canonicalRequest = {}, correlationId, options = {}) {
    logger.info(`[${correlationId}] LegacyConnector: Emulating protocol translation for mainframe records...`);

    // Check for simulated failure triggers
    if (options.mockMode === 'service_failure' || canonicalRequest.record_key === 'LEG-FAIL') {
      const legacyError = new Error('Legacy mainframe terminal connection reset (Error 0x80040154)');
      legacyError.status = 'FAILED';
      legacyError.error_code = 'LEGACY_SYSTEM_OFFLINE';
      legacyError.retryable = true;
      legacyError.correlation_id = correlationId;
      throw legacyError;
    }

    if (options.mockMode === 'non_retryable_failure' || canonicalRequest.record_key === 'LEG-NOT-FOUND') {
      const notFoundError = new Error('Archive microfilm / ledger index record not found');
      notFoundError.status = 'FAILED';
      notFoundError.error_code = 'LEGACY_RECORD_NOT_FOUND';
      notFoundError.retryable = false;
      notFoundError.correlation_id = correlationId;
      throw notFoundError;
    }

    // Simulate legacy mainframe query latency (20-40ms)
    await new Promise((resolve) => setTimeout(resolve, 30));

    // Simulated raw legacy mainframe envelope
    const rawLegacyEnvelope = {
      SOAP_HEADER: {
        TRANSACTION_TIMESTAMP: new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        SYSTEM_ID: 'MAINFRAME-SYS-09',
        CORRELATION_TRACK: correlationId,
      },
      SOAP_BODY: {
        LEGACY_RECORD: {
          REC_KEY: canonicalRequest.record_key || canonicalRequest.recordKey || 'LEG-ARCHIVE-9001',
          CITIZEN_REF: canonicalRequest.citizen_id || canonicalRequest.citizenId || 'CZN-1001',
          SYS_ORIGIN: 'STATE_CENTRAL_ARCHIVE_1998',
          DOC_STATUS: 'VALID_CONFIRMED',
          ISSUED_YEAR: '2021',
          METADATA_FLAGS: 'FLAG_VERIFIED|FLAG_NON_REVOKED|FLAG_HARD_COPY_DIGITIZED',
        },
      },
    };

    return rawLegacyEnvelope;
  }

  /**
   * Sandbox mode for legacy connector
   */
  async executeSandbox(canonicalRequest, correlationId, options = {}) {
    return this.executeLegacy(canonicalRequest, correlationId, options);
  }
}

export const legacyConnector = new LegacyConnector();
export default legacyConnector;
