'use client';

import { useState, useEffect } from 'react';
import { addDocument, getDocuments } from '../lib/firebase/firebaseUtils';
import { useAuth } from '../lib/hooks/useAuth';
import { SAMPLE_TYPE_OPTIONS, SEASON_OPTIONS, PATTERN_STATUS_OPTIONS } from '../lib/constants';

interface Buyer {
  id?: string;
  buyerId: string;
  name: string;
}

interface Sample {
  id: string;
  sampleId: string;
  timestamp: string;
  status: string;
  samplePriorityNo: string;
  patternNo: string;
  patternStatus: string;
  buyerRequestDate: string;
  buyer: string;
  buyerId: string; // New field to store the buyer's ID
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
  requiredCompletionDate: string;
  expectedCompletionDate: string;
  actualSampleReceivedDate: string;
  changeTracking: {
    [key: string]: ChangeInfo;
  };
  size: string;
  washType: string;
}

interface DuplicateSample {
  samplePriorityNo: string;
  patternNo: string;
  patternStatus: string;
  buyerRequestDate: string;
  buyer: string;
  buyerId: string;
  style: string;
  season: string;
  typeOfSample: string;
  color: string;
  noOfPieces: number;
  typeOfFabric: string;
  requiredFabricQty: number;
  requiredCompletionDate: string;
  size: string;
  washType: string;
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
  const now = new Date();
  
  // Get year and month components
  const year = now.getFullYear().toString().slice(-1);  // Last digit of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0');  // 01-12
  
  // Create a unique 3-digit sequence using:
  // - Hours (00-23) -> first digit
  // - Minutes (00-59) -> second digit
  // - Milliseconds (000-999) -> last digit
  const hours = now.getHours().toString();
  const minutes = now.getMinutes().toString();
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  
  // Create 3-digit timestamp sequence
  const timeSeq = (
    parseInt(hours + minutes + ms) % 1000  // Ensure it's 3 digits
  ).toString().padStart(3, '0');
  
  // Generate random number (0-9)
  const randomDigit = Math.floor(Math.random() * 10);
  
  // Format: SAM-YMM-TTTR
  return `S-${year}${month}-${timeSeq}${randomDigit}`;
}

export default function SampleForm({ onClose, onSampleAdded, duplicateSample }: SampleFormProps) {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    sampleId: '',
    status: 'New',
    samplePriorityNo: '',
    patternNo: '',
    patternStatus: '', // Add this line
    buyerRequestDate: '',
    buyer: '',
    buyerId: '', // New field to store the buyer's ID
    style: '',
    season: '',
    typeOfSample: '',
    noOfPieces: 0,
    typeOfFabric: '',
    color: '',
    size: '', // Add this line
    washType: '', // Add this line
    requiredFabricQty: 0,
    requiredCompletionDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  useEffect(() => {
    const fetchSampleIdAndBuyers = async () => {
      try {
        const id = await generateSampleId();
        const buyersData = await getDocuments('buyer') as Buyer[];
        setBuyers(buyersData);
        if (duplicateSample) {
          setFormData({
            ...formData,
            sampleId: id,
            status: 'New',
            samplePriorityNo: duplicateSample.samplePriorityNo,
            patternNo: duplicateSample.patternNo,
            patternStatus: duplicateSample.patternStatus,
            buyerRequestDate: duplicateSample.buyerRequestDate,
            buyer: duplicateSample.buyer,
            buyerId: duplicateSample.buyerId, // Set the buyerId for duplicated sample
            style: duplicateSample.style,
            season: duplicateSample.season,
            typeOfSample: duplicateSample.typeOfSample,
            noOfPieces: duplicateSample.noOfPieces,
            typeOfFabric: duplicateSample.typeOfFabric,
            color: duplicateSample.color, // Include color
            size: duplicateSample.size || '', // Add this line
            washType: duplicateSample.washType || '', // Add this line
            requiredFabricQty: duplicateSample.requiredFabricQty, // Include requiredFabricQty
            requiredCompletionDate: duplicateSample.requiredCompletionDate,
          });
        } else {
          setFormData(prev => ({ ...prev, sampleId: id }));
        }
      } catch (err) {
        console.error('Error generating sample ID or fetching buyers:', err);
        setError('Failed to initialize form. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSampleIdAndBuyers();
  }, [duplicateSample]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'buyer') {
      const selectedBuyer = buyers.find(b => b.name === value);
      setFormData(prevData => ({
        ...prevData,
        [name]: value,
        buyerId: selectedBuyer ? selectedBuyer.buyerId : ''
      }));
    } else {
      setFormData(prevData => ({ ...prevData, [name]: value }));
    }
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

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
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
            <label htmlFor="patternStatus" className="block text-sm font-medium text-gray-700">Pattern Status</label>
            <select
              name="patternStatus"
              id="patternStatus"
              value={formData.patternStatus}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">Select pattern status</option>
              {PATTERN_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="buyerRequestDate" className="block text-sm font-medium text-gray-700">Buyer Request Date</label>
            <input
              type="date"
              name="buyerRequestDate"
              id="buyerRequestDate"
              value={formData.buyerRequestDate}
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
              {buyers.map((buyer) => (
                <option key={buyer.buyerId} value={buyer.name}>{buyer.name}</option>
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
              type="number"
              min="0"
              name="noOfPieces"
              id="noOfPieces"
              value={formData.noOfPieces}
              onChange={handleChange}
              onWheel={handleWheel}
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
            <label htmlFor="size" className="block text-sm font-medium text-gray-700">Size</label>
            <input
              type="text"
              name="size"
              id="size"
              value={formData.size}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="washType" className="block text-sm font-medium text-gray-700">Wash Type</label>
            <input
              type="text"
              name="washType"
              id="washType"
              value={formData.washType}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="requiredFabricQty" className="block text-sm font-medium text-gray-700">Total Fabric Qty Required</label>
            <input
              type="number"
              min="0"
              name="requiredFabricQty"
              id="requiredFabricQty"
              value={formData.requiredFabricQty}
              onChange={handleChange}
              onWheel={handleWheel}
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
