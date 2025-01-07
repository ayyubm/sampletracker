import { useState } from 'react';
import { STATUS_OPTIONS } from '../lib/constants';
import { PDFDownloadLink } from '@react-pdf/renderer';
import SampleListPDF from './SampleListPDF';

interface PrintSamplesModalProps {
  onClose: () => void;
  samples: any[];
}

export default function PrintSamplesModal({ onClose, samples }: PrintSamplesModalProps) {
  const [selectedStatus, setSelectedStatus] = useState('');

  const filteredSamples = selectedStatus 
    ? samples.filter(sample => sample.status === selectedStatus)
    : [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Print Samples by Status
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              <option value="">Select a status...</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            {selectedStatus && filteredSamples.length > 0 && (
              <PDFDownloadLink
                document={<SampleListPDF samples={filteredSamples} status={selectedStatus} />}
                fileName={`samples-${selectedStatus.toLowerCase()}.pdf`}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Download PDF
              </PDFDownloadLink>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 