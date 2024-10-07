'use client';

import { useState, useEffect } from 'react';
import { addDocument, getDocuments } from '../lib/firebase/firebaseUtils';
import { useAuth } from '../lib/hooks/useAuth';
import { BUYER_OPTIONS, SAMPLE_TYPE_OPTIONS, SEASON_OPTIONS } from '../lib/constants';

interface Sample {
  id: string;
  sampleId: string;
  timestamp: string;
  status: string;
  samplePriorityNo: string;
  patternNo: string; // New field
  sampleRequestDate: string;
  buyer: string;
  style: string;
  season: string;
  typeOfSample: string;
  color: string; // New field
  noOfPieces: string;
  typeOfFabric: string;
  requiredFabricQty: string;
  procuredFabricQty: string;
  stockFabricQty: string;
  fabricIssueDate: string;
  fabricReceiptDate: string;
  requiredCompletionDate: string;
  expectedCompletionDate: string;
  actualCompletionDate: string;
  cutQty: string;
  shipQty: string;
  rejectQty: string;
  alterQty: string;
  changeTracking: {
    [key: string]: ChangeInfo;
  };
}

interface DuplicateSample {
  samplePriorityNo: string;
  patternNo: string;
  sampleRequestDate: string;
  buyer: string;
  style: string;
  season: string;
  typeOfSample: string;
  color: string;
  noOfPieces: string;
  typeOfFabric: string;
  requiredFabricQty: string;
  requiredCompletionDate: string;
}

interface SampleFormProps {
  onClose: () => void;
  onSampleAdded: () => void;
  duplicateSample?: DuplicateSample | null;
}

interface ChangeInfo {
  name: string;
  timestamp: string;
}

async function generateSampleId(): Promise<string> {
  const samples: Sample[] = await getDocuments('samples');
  const maxId = samples.reduce((max, sample) => {
    if (sample.sampleId && typeof sample.sampleId === 'string') {
      const parts = sample.sampleId.split('-');
      if (parts.length > 1) {
        const id = parseInt(parts[1]);
        return isNaN(id) ? max : Math.max(max, id);
      }
    }
    return max;
  }, 0);
  return `SAMPLE-${(maxId + 1).toString().padStart(4, '0')}`;
}

export default function SampleForm({ onClose, onSampleAdded, duplicateSample }: SampleFormProps) {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    sampleId: '',
    status: 'New',
    samplePriorityNo: '',
    patternNo: '',
    sampleRequestDate: '',
    buyer: '',
    style: '',
    season: '',
    typeOfSample: '',
    noOfPieces: '',
    typeOfFabric: '',
    color: '',
    requiredFabricQty: '',
    requiredCompletionDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSampleId = async () => {
      try {
        const id = await generateSampleId();
        if (duplicateSample) {
          setFormData({
            ...formData,
            sampleId: id,
            status: 'New',
            samplePriorityNo: duplicateSample.samplePriorityNo,
            patternNo: duplicateSample.patternNo,
            sampleRequestDate: duplicateSample.sampleRequestDate,
            buyer: duplicateSample.buyer,
            style: duplicateSample.style,
            season: duplicateSample.season,
            typeOfSample: duplicateSample.typeOfSample,
            noOfPieces: duplicateSample.noOfPieces,
            typeOfFabric: duplicateSample.typeOfFabric,
            color: duplicateSample.color, // Include color
            requiredFabricQty: duplicateSample.requiredFabricQty, // Include requiredFabricQty
            requiredCompletionDate: duplicateSample.requiredCompletionDate,
          });
        } else {
          setFormData(prev => ({ ...prev, sampleId: id }));
        }
      } catch (err) {
        console.error('Error generating sample ID:', err);
        setError('Failed to generate sample ID. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSampleId();
  }, [duplicateSample]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (userData) {
      const changeInfo: ChangeInfo = {
        name: userData.firstName,
        timestamp: new Date().toISOString()
      };
      const changeTracking: { [key: string]: ChangeInfo } = {};
      Object.keys(formData).forEach(key => {
        if (formData[key as keyof typeof formData]) {
          changeTracking[key] = changeInfo;
        }
      });
      const newSample = {
        ...formData,
        status: 'New',
        changeTracking,
        timestamp: new Date().toISOString(),
      };
      await addDocument('samples', newSample);
      onSampleAdded();
      onClose();
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-600">{error}</div>;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add New Sample</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="mb-4">
            <label htmlFor="sampleId" className="block text-sm font-medium text-gray-700">Sample ID</label>
            <input
              type="text"
              name="sampleId"
              id="sampleId"
              value={formData.sampleId}
              readOnly
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="samplePriorityNo" className="block text-sm font-medium text-gray-700">Sample Priority No.</label>
            <input
              type="text"
              name="samplePriorityNo"
              id="samplePriorityNo"
              value={formData.samplePriorityNo}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="patternNo" className="block text-sm font-medium text-gray-700">Pattern No.</label>
            <input
              type="text"
              name="patternNo"
              id="patternNo"
              value={formData.patternNo}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="sampleRequestDate" className="block text-sm font-medium text-gray-700">Sample Request Date</label>
            <input
              type="date"
              name="sampleRequestDate"
              id="sampleRequestDate"
              value={formData.sampleRequestDate}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="buyer" className="block text-sm font-medium text-gray-700">Buyer</label>
            <select
              name="buyer"
              id="buyer"
              value={formData.buyer}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Select a buyer</option>
              {BUYER_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="style" className="block text-sm font-medium text-gray-700">Style</label>
            <input
              type="text"
              name="style"
              id="style"
              value={formData.style}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="season" className="block text-sm font-medium text-gray-700">Season</label>
            <select
              name="season"
              id="season"
              value={formData.season}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Select a season</option>
              {SEASON_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="typeOfSample" className="block text-sm font-medium text-gray-700">Type of Sample</label>
            <select
              name="typeOfSample"
              id="typeOfSample"
              value={formData.typeOfSample}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            >
              <option value="">Select sample type</option>
              {SAMPLE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="noOfPieces" className="block text-sm font-medium text-gray-700">No. of Pieces</label>
            <input
              type="text"
              name="noOfPieces"
              id="noOfPieces"
              value={formData.noOfPieces}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="typeOfFabric" className="block text-sm font-medium text-gray-700">Type of Fabric</label>
            <input
              type="text"
              name="typeOfFabric"
              id="typeOfFabric"
              value={formData.typeOfFabric}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">Color</label>
            <input
              type="text"
              name="color"
              id="color"
              value={formData.color}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="requiredFabricQty" className="block text-sm font-medium text-gray-700">Required Fabric Qty</label>
            <input
              type="text"
              name="requiredFabricQty"
              id="requiredFabricQty"
              value={formData.requiredFabricQty}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="requiredCompletionDate" className="block text-sm font-medium text-gray-700">Required Completion Date</label>
            <input
              type="date"
              name="requiredCompletionDate"
              id="requiredCompletionDate"
              value={formData.requiredCompletionDate}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              required
            />
          </div>
        </form>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Sample
          </button>
        </div>
      </div>
    </div>
  );
}