import { useState, useEffect, useMemo } from 'react';
import { STATUS_OPTIONS, BUYER_OPTIONS, PRODUCT_CATEGORY_OPTIONS } from '../lib/constants';
import { PDFDownloadLink } from '@react-pdf/renderer';
import SampleListPDF from './SampleListPDF';

// Define a base Sample interface that includes all fields needed by SampleListPDF
// and any fields needed for processing/filtering within this modal.
interface Sample {
  sampleId: string;
  status: string;         // Used for filtering in this modal
  buyer: string;          // Used for filtering in this modal
  productCategory?: string; // Used for filtering in this modal
  imageUrl?: string;      // Used for image processing in this modal
  // Fields required by SampleListPDF
  style: string;
  color: string;
  typeOfSample: string;
  noOfPieces: number;
  requiredCompletionDate: string;
  // Add any other properties if they are accessed from 'sample' object
}

interface SampleWithImage extends Sample {
  imageDataURI?: string; // This will be passed to SampleListPDF
}

interface PrintSamplesModalProps {
  onClose: () => void;
  samples: Sample[]; 
}

// Helper function to convert blob to data URI
const blobToDataURI = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function PrintSamplesModal({ onClose, samples }: PrintSamplesModalProps) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [processedSamples, setProcessedSamples] = useState<SampleWithImage[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // Debug log to check samples before filtering
  console.log(`Total samples: ${samples.length}`, samples[0]?.status);

  const filteredSamples: Sample[] = useMemo(() => {
    return samples.filter(sample => {
      const statusMatch = selectedStatus ? sample.status === selectedStatus : true;
      const buyerMatch = selectedBuyer ? sample.buyer === selectedBuyer : true;
      const categoryMatch = selectedCategory ? sample.productCategory === selectedCategory : true;
      
      return statusMatch && buyerMatch && categoryMatch;
    });
  }, [samples, selectedStatus, selectedBuyer, selectedCategory]);

  useEffect(() => {
    console.log('useEffect triggered for filteredSamples. Length:', filteredSamples.length);
    if (filteredSamples.length === 0) {
      setProcessedSamples([]);
      setIsProcessingImages(false); // Ensure loading state is reset if no samples to process
      return;
    }

    let isMounted = true; // Flag to prevent state updates if component unmounts

    const processImages = async () => {
      console.log('useEffect: Starting processImages. isProcessingImages was:', isProcessingImages);
      setIsProcessingImages(true);
      try {
        const samplesWithData = await Promise.all(
          filteredSamples.map(async (sample) => {
            let newSampleData: SampleWithImage = { ...sample, imageDataURI: undefined };
            if (sample.imageUrl && (sample.imageUrl.startsWith('http') || sample.imageUrl.startsWith('https'))) {
              try {
                const response = await fetch(sample.imageUrl);
                if (!response.ok) {
                  console.error(`Failed to fetch image: ${sample.imageUrl}, status: ${response.status}`);
                } else {
                  const blob = await response.blob();
                  const imageDataURI = await blobToDataURI(blob);
                  if (isMounted) {
                    newSampleData.imageDataURI = imageDataURI;
                  }
                }
              } catch (error) {
                console.error(`Error processing image ${sample.imageUrl}:`, error);
              }
            } else {
                if (sample.imageUrl && isMounted) {
                    console.warn(`Invalid or non-HTTP(S) imageUrl for sample ${sample.sampleId}: ${sample.imageUrl}`);
                }
            }
            return newSampleData;
          })
        );
        if (isMounted) {
          console.log('useEffect: Setting processedSamples. Length:', samplesWithData.length);
          setProcessedSamples(samplesWithData);
        }
      } catch (error) {
        console.error('Error processing images for PDF:', error);
        if (isMounted) {
          setProcessedSamples(filteredSamples.map(s => ({...s} as SampleWithImage))); 
        }
      }
      if (isMounted) {
        console.log('useEffect: Setting isProcessingImages to false.');
        setIsProcessingImages(false);
      }
    };

    processImages();

    return () => {
      isMounted = false;
      console.log('useEffect: Cleanup function ran.');
    };
  }, [filteredSamples]);

  // Create a display title based on active filters
  const getFilterTitle = () => {
    const filters = [];
    if (selectedStatus) filters.push(`Status: ${selectedStatus}`);
    if (selectedBuyer) filters.push(`Buyer: ${selectedBuyer}`);
    if (selectedCategory) filters.push(`Category: ${selectedCategory}`);
    
    return filters.length > 0 ? filters.join(' | ') : 'All Samples';
  };

  // Create a filename-friendly version without special characters
  const getFilenameFromFilters = () => {
    const parts = [];
    if (selectedStatus) parts.push(selectedStatus.toLowerCase().replace(/\s+/g, '-'));
    if (selectedBuyer) {
      // Use just the first word of the buyer name to keep filename shorter
      const firstWord = selectedBuyer.split(' ')[0].toLowerCase();
      parts.push(`${firstWord}-buyer`);
    }
    if (selectedCategory) parts.push(selectedCategory.toLowerCase());
    
    return parts.length > 0 ? `samples-${parts.join('-')}` : 'all-samples';
  };

  // Determine if any filter is applied
  const isAnyFilterApplied = selectedStatus || selectedBuyer || selectedCategory;

  console.log('PrintSamplesModal Render. isProcessingImages:', isProcessingImages, 'processedSamples Length:', processedSamples.length, 'filteredSamples Length:', filteredSamples.length);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[450px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Print Samples
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                console.log('Status changed to:', e.target.value);
                setSelectedStatus(e.target.value);
              }}
              className="w-full border rounded-md p-2"
            >
              <option value="">Any Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buyer
            </label>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              <option value="">Any Buyer</option>
              {BUYER_OPTIONS.map((buyer) => (
                <option key={buyer} value={buyer}>
                  {buyer}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              <option value="">Any Category</option>
              {PRODUCT_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
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
            
            {(filteredSamples.length > 0 || (isProcessingImages && isAnyFilterApplied)) ? (
              <PDFDownloadLink
                document={<SampleListPDF samples={processedSamples as any} status={getFilterTitle()} />}
                fileName={`${getFilenameFromFilters()}.pdf`}
                className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
                  isProcessingImages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessingImages ? 'Processing Images...' : 'Download PDF'}
              </PDFDownloadLink>
            ) : isAnyFilterApplied ? (
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded opacity-50 cursor-not-allowed"
                disabled
              >
                No Samples Found
              </button>
            ) : (
              <PDFDownloadLink
                document={<SampleListPDF samples={samples as any} status="All Samples" />}
                fileName={`all-samples.pdf`}
                className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600`}
              >
                Download All Samples
              </PDFDownloadLink>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
