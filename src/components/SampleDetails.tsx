'use client';

import { useState, useEffect } from 'react';
import { getDocument, updateDocument } from '../lib/firebase/firebaseUtils';
import { useAuth } from '../lib/hooks/useAuth';
import { format } from 'date-fns';
import { BUYER_OPTIONS, SAMPLE_TYPE_OPTIONS, STATUS_OPTIONS, SEASON_OPTIONS, PATTERN_STATUS_OPTIONS } from '../lib/constants';


interface SampleDetailsProps {
  sampleId: string;
  onClose: () => void;
  onSampleUpdated: () => void;
}

interface ChangeInfo {
  name: string;
  timestamp: string;
}

interface SampleData {
  sampleId: string;
  timestamp: string;
  status: string;
  samplePriorityNo: string;
  patternNo: string;
  patternStatus: string;
  buyerRequestDate: string;
  buyer: string;
  style: string;
  season: string;
  typeOfSample: string;
  color: string;
  noOfPieces: number;
  typeOfFabric: string;
  requiredFabricQty: number;
  procuredFabricQty: number;
  stockFabricQty: number;
  fabricIssueDate: string;
  fabricTrimsReceiptDate: string;
  fabricRejectQty: number; // Add this line
  requiredCompletionDate: string;
  expectedCompletionDate: string;
  actualSampleReceivedDate: string;
  cutQty: number;
  alterQty: number;
  rejectQty: number;
  shipQty: number;
  changeTracking: {
    [key: string]: ChangeInfo;
  };
  remarks: {
    text: string;
    timestamp: string;
    user: string;
  }[];
}

const defaultSampleData: SampleData = {
  sampleId: '',
  timestamp: '',
  status: 'New',
  samplePriorityNo: '',
  patternNo: '',
  patternStatus: 'New',
  buyerRequestDate: '',
  buyer: '',
  style: '',
  season: '',
  typeOfSample: '',
  color: '',
  noOfPieces: 0,
  typeOfFabric: '',
  requiredFabricQty: 0,
  procuredFabricQty: 0,
  stockFabricQty: 0,
  fabricIssueDate: '',
  fabricTrimsReceiptDate: '',
  fabricRejectQty: 0, // Add this line
  requiredCompletionDate: '',
  expectedCompletionDate: '',
  actualSampleReceivedDate: '',
  cutQty: 0,
  alterQty: 0,
  rejectQty: 0,
  shipQty: 0,
  changeTracking: {},
  remarks: [],
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return format(date, "dd/MM/yy @ hh:mm:ss a");
}

export default function SampleDetails({ sampleId, onClose, onSampleUpdated }: SampleDetailsProps) {
  const [sample, setSample] = useState<SampleData>(defaultSampleData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalSample, setOriginalSample] = useState<SampleData>(defaultSampleData);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchSample = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedSample = await getDocument('samples', sampleId);
        const { id, ...sampleWithoutId } = fetchedSample;
        const sampleData = { ...defaultSampleData, ...sampleWithoutId };
        setSample(sampleData);
        setOriginalSample(sampleData);
      } catch (err) {
        console.error('Error fetching sample:', err);
        setError('Failed to load sample details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSample();
  }, [sampleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSample(prevSample => ({
      ...prevSample,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sample && userData) {
      const changeInfo: ChangeInfo = {
        name: userData.firstName,
        timestamp: new Date().toISOString()
      };
      const updatedChangeTracking = { ...sample.changeTracking };
      Object.keys(sample).forEach(key => {
        if (sample[key as keyof SampleData] !== originalSample[key as keyof SampleData]) {
          updatedChangeTracking[key] = changeInfo;
        }
      });
      const updatedSample = {
        ...sample,
        changeTracking: updatedChangeTracking,
      };
      await updateDocument('samples', sampleId, updatedSample);
      onSampleUpdated();
      onClose();
    }
  };

  const formatChangeInfo = (changeInfo: ChangeInfo | undefined) => {
    if (!changeInfo) return '';
    return `${changeInfo.name} on ${formatTimestamp(changeInfo.timestamp)}`;
  };

  const fieldOrder = [
    'sampleId',
    'timestamp',
    'status',
    'samplePriorityNo',
    'patternNo',
    'patternStatus',
    'buyerRequestDate',
    'buyer',
    'style',
    'season',
    'typeOfSample',
    'noOfPieces',
    'typeOfFabric',
    'color',
    'requiredFabricQty',
    'procuredFabricQty',
    'stockFabricQty',
    'fabricIssueDate',
    'fabricTrimsReceiptDate',
    'fabricRejectQty', // Add this line
    'requiredCompletionDate',
    'expectedCompletionDate',
    'actualSampleReceivedDate',
    'cutQty',
    'alterQty',
    'rejectQty',
    'shipQty',
  ];

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  if (loading) return <div className="text-center mt-8">Loading sample details...</div>;
  if (error) return <div className="text-center mt-8 text-red-600">{error}</div>;
  if (!sample) return <div className="text-center mt-8">No sample found.</div>;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Sample Details</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {fieldOrder.map((key) => {
            const value = sample[key as keyof SampleData];
            return (
              <div key={key} className="mb-4">
                <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                  {key === 'fabricRejectQty' ? 'Fabric Reject Qty' : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                {key === 'fabricRejectQty' || key === 'noOfPieces' || key === 'cutQty' || key === 'shipQty' || key === 'rejectQty' || key === 'alterQty' || key === 'requiredFabricQty' || key === 'procuredFabricQty' || key === 'stockFabricQty' ? (
                  <input
                    type="number"
                    min="0"
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    onWheel={handleWheel}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                ) : key === 'timestamp' ? (
                  <input
                    type="text"
                    name={key}
                    id={key}
                    value={formatTimestamp(value as string)}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
                  />
                ) : key === 'buyer' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select a buyer</option>
                    {BUYER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : key === 'typeOfSample' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select sample type</option>
                    {SAMPLE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : key === 'status' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : key === 'season' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select a season</option>
                    {SEASON_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : key === 'patternStatus' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select pattern status</option>
                    {PATTERN_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={key.includes('Date') ? 'date' : 'text'}
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    readOnly={key === 'sampleId' || key === 'timestamp'}
                  />
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {formatChangeInfo(sample.changeTracking[key])}
                </div>
              </div>
            );
          })}
          <div className="col-span-2 mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Sample
            </button>
          </div>
        </form>

        {/* Add this new section for remarks */}
        <div className="mt-6">
          <h4 className="text-md font-medium leading-6 text-gray-900 mb-2">Remarks</h4>
          <div className="max-h-40 overflow-y-auto mb-4 border rounded p-2">
            {sample.remarks && sample.remarks.length > 0 ? (
              sample.remarks.map((remark: any, index: number) => (
                <div key={index} className="mb-2 p-2 bg-gray-100 rounded">
                  <p className="text-sm">{remark.text}</p>
                  <p className="text-xs text-gray-500">
                    By {remark.user} on {new Date(remark.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No remarks yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
