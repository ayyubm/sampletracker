'use client';

import { useState, useEffect } from 'react';
import { getDocument, updateDocument, getDocuments, uploadFile } from '../lib/firebase/firebaseUtils';
import { useAuth } from '../lib/hooks/useAuth';
import { format } from 'date-fns';
import { BUYER_OPTIONS, SAMPLE_TYPE_OPTIONS, STATUS_OPTIONS, SEASON_OPTIONS, PATTERN_STATUS_OPTIONS, PRODUCT_CATEGORY_OPTIONS, FABRIC_CATEGORY_OPTIONS } from '../lib/constants';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import SamplingProgramSheet from './SamplingProgramSheet';
import { Sample } from '../types/sample';
import { User } from '../types/user';


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
  buyerId: string;
  style: string;
  season: string;
  productCategory: string;
  typeOfSample: string;
  color: string;
  size: string;
  washType: string;
  noOfPieces: number;
  typeOfFabric: string;
  fabricCategory: string;
  requiredFabricQty: number;
  totalFabricQtyRecieved: number;


  fabricTrimsReceiptDate: string;
  fabricRejectQty: number;
  requiredCompletionDate: string;
  expectedCompletionDate: string;
  SampleDispatchDate: string;
  balanceLeftoverFabric: number;
  changeTracking: {
    [key: string]: ChangeInfo;
  };
  remarks: {
    text: string;
    timestamp: string;
    user: string;
  }[];
  fabricSerialNumbers: string[];
  imageUrl?: string;
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
  buyerId: '',
  style: '',
  season: '',
  productCategory: '',
  typeOfSample: '',
  color: '',
  size: '',
  washType: '',
  noOfPieces: 0,
  typeOfFabric: '',
  fabricCategory: '',
  requiredFabricQty: 0,
  totalFabricQtyRecieved: 0,


  fabricTrimsReceiptDate: '',
  fabricRejectQty: 0,
  requiredCompletionDate: '',
  expectedCompletionDate: '',
  SampleDispatchDate: '',
  balanceLeftoverFabric: 0,
  changeTracking: {},
  remarks: [],
  fabricSerialNumbers: [],
  imageUrl: '',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const formattedDate = format(date, "dd/MM/yyyy @ HH:mm:ss");
  return formattedDate;
}

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
}

// Add this type definition
type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  // Add other properties as needed
};

export default function SampleDetails({ sampleId, onClose, onSampleUpdated }: SampleDetailsProps) {
  const [sample, setSample] = useState<SampleData>(defaultSampleData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalSample, setOriginalSample] = useState<SampleData>(defaultSampleData);
  const { userData } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [serialNumberInput, setSerialNumberInput] = useState('');
  
  // Add state variables for image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const fetchSampleAndBuyers = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fetchedSample, buyersData] = await Promise.all([
          getDocument('samples', sampleId),
          getDocuments('buyer')
        ]);
        const { id, ...sampleWithoutId } = fetchedSample;
        const sampleData = { ...defaultSampleData, ...sampleWithoutId };
        setSample(sampleData);
        setOriginalSample(sampleData);
        setBuyers(buyersData as Buyer[]);
      } catch (err) {
        console.error('Error fetching sample or buyers:', err);
        setError('Failed to load sample details or buyers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSampleAndBuyers();
  }, [sampleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'buyer') {
      const selectedBuyer = buyers.find(b => b.name === value);
      if (selectedBuyer) {
        setSample(prevSample => ({
          ...prevSample,
          [name]: value,
          buyerId: selectedBuyer.buyerId
        }));
      }
    } else {
      setSample(prevSample => ({
        ...prevSample,
        [name]: value,
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sample && userData) {
      try {
        // Upload image if a new one is selected
        let imageUrl = sample.imageUrl || '';
        if (imageFile) {
          setImageUploading(true);
          const path = `samples/${sample.sampleId}/${imageFile.name}`;
          imageUrl = await uploadFile(imageFile, path);
        }
        
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
        
        // Add imageUrl to change tracking if it was updated
        if (imageUrl !== originalSample.imageUrl) {
          updatedChangeTracking['imageUrl'] = changeInfo;
        }
        
        const updatedSample = {
          ...sample,
          imageUrl,
          changeTracking: updatedChangeTracking,
        };
        
        await updateDocument('samples', sampleId, updatedSample);
        onSampleUpdated();
        onClose();
      } catch (err) {
        console.error('Error updating sample:', err);
        setError('Failed to update sample. Please try again.');
      } finally {
        setImageUploading(false);
      }
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
    'productCategory',
    'typeOfSample',
    'color',
    'size',
    'washType',
    'noOfPieces',
    'typeOfFabric',
    'fabricCategory',
    'requiredFabricQty',
    'totalFabricQtyRecieved',


    'fabricTrimsReceiptDate',
    'fabricRejectQty',
    'balanceLeftoverFabric',
    'requiredCompletionDate',
    'expectedCompletionDate',
    'SampleDispatchDate',
    
  ];

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const handleSerialNumberAdd = () => {
    if (serialNumberInput && !sample.fabricSerialNumbers.includes(serialNumberInput)) {
      setSample(prev => ({
        ...prev,
        fabricSerialNumbers: [...prev.fabricSerialNumbers, serialNumberInput]
      }));
      setSerialNumberInput('');
    }
  };

  const handleSerialNumberRemove = (numberToRemove: string) => {
    setSample(prev => ({
      ...prev,
      fabricSerialNumbers: prev.fabricSerialNumbers.filter(num => num !== numberToRemove)
    }));
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
                  {key==='requiredFabricQty'? "Total Fabric Qty Required" : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                {key === 'fabricRejectQty' || key === 'noOfPieces' || key === 'requiredFabricQty' || key === 'totalFabricQtyRecieved' || key === 'balanceLeftoverFabric'  ? (
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
                    {buyers.map((buyer) => (
                      <option key={buyer.buyerId} value={buyer.name}>
                        {buyer.name}
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
                  >
                    <option value="">Select pattern status</option>
                    {PATTERN_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : key === 'productCategory' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select a category</option>
                    {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : key === 'fabricCategory' ? (
                  <select
                    name={key}
                    id={key}
                    value={value as string}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select fabric category</option>
                    {FABRIC_CATEGORY_OPTIONS.map((option) => (
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
          <div className="col-span-2 mb-4">
            <label htmlFor="fabricSerialNumber" className="block text-sm font-medium text-gray-700">
              Fabric Serial Numbers
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                id="fabricSerialNumber"
                value={serialNumberInput}
                onChange={(e) => setSerialNumberInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSerialNumberAdd();
                  }
                }}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="Enter serial number"
              />
              <button
                type="button"
                onClick={handleSerialNumberAdd}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {sample.fabricSerialNumbers.map((number) => (
                <div
                  key={number}
                  className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                >
                  <span>{number}</span>
                  <button
                    type="button"
                    onClick={() => handleSerialNumberRemove(number)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatChangeInfo(sample.changeTracking['fabricSerialNumbers'])}
            </div>
          </div>
          
          {/* Image upload/display section */}
          <div className="col-span-2 mb-4">
            <label className="block text-sm font-medium text-gray-700">Sample Image</label>
            <div className="mt-2 flex items-start gap-4">
              {/* Display current image if it exists */}
              {(sample.imageUrl || imagePreview) && (
                <div className="relative w-60 h-60">
                  <img
                    src={imagePreview || sample.imageUrl}
                    alt="Sample"
                    className="object-cover w-full h-full rounded-md border border-gray-300"
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex-1">
                <input
                  type="file"
                  id="sampleImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">Upload a new image to replace the current one.</p>
                {sample.imageUrl && !imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setSample(prev => ({ ...prev, imageUrl: '' }));
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove current image
                  </button>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {formatChangeInfo(sample.changeTracking['imageUrl'])}
                </div>
              </div>
            </div>
          </div>
          
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
              disabled={imageUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {imageUploading ? 'Uploading...' : 'Update Sample'}
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
                    By {remark.user} on {format(new Date(remark.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No remarks yet.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
          {/* Update the PDF generation button */}
          <BlobProvider document={<SamplingProgramSheet sample={sample as Sample} firstName={sample.changeTracking['sampleId'].name} />}>
            {({ url, loading, error }) => (
              <a
                href={url || '#'}
                download={`sampling_program_sheet_${sample.sampleId}.pdf`}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading || error ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => {
                  if (loading || error) e.preventDefault();
                }}
              >
                {loading ? 'Loading document...' : error ? 'Error' : 'Generate Sampling Program Sheet'}
              </a>
            )}
          </BlobProvider>
        </div>
      </div>
    </div>
  );
}
