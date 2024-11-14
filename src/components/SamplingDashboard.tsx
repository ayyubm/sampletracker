'use client';

import { useState, useEffect } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { format, addDays } from 'date-fns';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

interface Sample {
  id: string;
  sampleId: string;
  buyerId: string;
  buyer: string;
  style: string;
  typeOfSample: string;
  fabricTrimsReceiptDate: string;
  status: string;
  isArchived: boolean;
}

interface GroupedSamples {
  cutting: Sample[];
  sewing: Sample[];
  finishing: Sample[];
  qa: Sample[];
  danger: Sample[];
  newReceipts: Sample[];
}

const getStatusColor = (sample: Sample, stage: keyof GroupedSamples): string => {
  const status = sample.status;
  
  switch(stage) {
    case 'cutting':
      if (status === 'Under Cutting' || status === 'Cutting Ready') return 'bg-green-100';
      if (status === 'New' || status === 'Fabric Under Washing') return 'bg-red-100';
      if (status === 'Garment Ready' || status === 'Dispatched') return 'bg-gray-100';
      return 'bg-amber-100';
      
    case 'sewing':
      if (status === 'Under Sewing' || status === 'Sewing Ready') return 'bg-green-100';
      if (['New', 'Fabric Under Washing', 'Under Cutting', 'Cutting Ready'].includes(status)) return 'bg-red-100';
      if (status === 'Garment Ready' || status === 'Dispatched') return 'bg-gray-100';
      return 'bg-amber-100';
      
    case 'finishing':
      if (status === 'Under Finishing' || status === 'Under Washing' || status === 'Under Ebellishment') return 'bg-green-100';
      if (status === 'Garment Ready' || status === 'Dispatched') return 'bg-gray-100';
      if (status === 'QA Review') return 'bg-amber-100';
      return 'bg-red-100';

    case 'qa':
      if (status === 'QA Review') return 'bg-green-100';
      if (status === 'Garment Ready' || status === 'Dispatched') return 'bg-gray-100';
      return 'bg-red-100';

    case 'danger':
      return 'bg-red-50';
      
    default:
      return 'bg-white';
  }
};

export default function SamplingDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [samples, setSamples] = useState<GroupedSamples>({
    cutting: [],
    sewing: [],
    finishing: [],
    qa: [],
    danger: [],
    newReceipts: []
  });
  const [loading, setLoading] = useState(true);
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<string>('all');
  const [buyers, setBuyers] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<keyof GroupedSamples | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      const fetchedSamples = await getDocuments('samples') as Sample[];
      setAllSamples(fetchedSamples);
      
      // Extract unique buyers
      const uniqueBuyers = Array.from(new Set(fetchedSamples.map(sample => sample.buyer)))
        .filter(buyer => buyer) // Remove empty/null values
        .sort();
      setBuyers(uniqueBuyers);
      
      groupSamples(fetchedSamples);
      setLoading(false);
    };

    fetchSamples();
  }, []);

  useEffect(() => {
    const filteredSamples = selectedBuyer === 'all' 
      ? allSamples 
      : allSamples.filter(sample => sample.buyer === selectedBuyer);
    
    groupSamples(filteredSamples);
  }, [selectedBuyer, allSamples]);

  const groupSamples = (samplesToGroup: Sample[]) => {
    const today = new Date();
    
    const grouped: GroupedSamples = {
      cutting: [],
      sewing: [],
      finishing: [],
      qa: [],
      danger: [],
      newReceipts: []
    };

    samplesToGroup.forEach(sample => {
      if (sample.isArchived || !sample.fabricTrimsReceiptDate || 
          sample.status === 'Garment Ready' || sample.status === 'Dispatched') {
        return;
      }

      const receiptDate = new Date(sample.fabricTrimsReceiptDate);
      const daysSinceReceipt = Math.floor((today.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceReceipt === 0) {
        grouped.newReceipts.push(sample);
      } else if (daysSinceReceipt === 1) {
        grouped.cutting.push(sample);
      } else if (daysSinceReceipt === 2 || daysSinceReceipt === 3) {
        grouped.sewing.push(sample);
      } else if (daysSinceReceipt === 4) {
        grouped.finishing.push(sample);
      } else if (daysSinceReceipt === 5 || daysSinceReceipt === 6) {
        grouped.qa.push(sample);
      } else if (daysSinceReceipt >= 7) {
        grouped.danger.push(sample);
      }
    });

    setSamples(grouped);
  };

  const renderSampleList = (sampleList: Sample[], stage: keyof GroupedSamples) => (
    <div className="grid grid-cols-1 gap-3">
      {sampleList.map(sample => (
        <div
          key={sample.id}
          className={`p-4 rounded-lg shadow ${getStatusColor(sample, stage)}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="font-semibold">{sample.sampleId}</span>
              <p className="text-sm text-gray-600">{sample.buyer}</p>
              <p className="text-sm text-gray-600">{sample.style}</p>
              <p className="text-sm text-gray-600">{sample.typeOfSample}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-1 text-sm rounded bg-gray-200">
                {sample.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSectionButton = (
    section: keyof GroupedSamples,
    label: string,
    count: number,
    dotColor: string,
    showOnlyIfHasItems: boolean = false
  ) => {
    if (showOnlyIfHasItems && count === 0) return null;

    return (
      <button
        onClick={() => setSelectedSection(section)}
        className={`w-full text-left p-4 rounded-lg transition-all ${
          selectedSection === section
            ? 'bg-white shadow-md scale-[1.02]'
            : 'bg-gray-50 hover:bg-white hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full ${dotColor} mr-2`}></span>
            <span className="font-semibold">{label}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-sm ${
            selectedSection === section ? 'bg-blue-100 text-blue-800' : 'bg-gray-200'
          }`}>
            {count}
          </span>
        </div>
      </button>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">Sampling Dashboard</h1>
        </div>
        <div className="flex items-center">
          <label htmlFor="buyerFilter" className="mr-2 text-gray-700">
            Filter by Buyer:
          </label>
          <select
            id="buyerFilter"
            value={selectedBuyer}
            onChange={(e) => setSelectedBuyer(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Buyers</option>
            {buyers.map((buyer) => (
              <option key={buyer} value={buyer}>
                {buyer}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with sections */}
        <div className="w-80 bg-gray-50 p-4 overflow-y-auto border-r">
          <div className="space-y-3">
            {renderSectionButton(
              'newReceipts',
              'New Receipts Today',
              samples.newReceipts.length,
              'bg-blue-500',
              true
            )}
            {renderSectionButton(
              'cutting',
              'Should be in Cutting',
              samples.cutting.length,
              'bg-yellow-500'
            )}
            {renderSectionButton(
              'sewing',
              'Should be in Sewing',
              samples.sewing.length,
              'bg-orange-500'
            )}
            {renderSectionButton(
              'finishing',
              'Should be in Finishing',
              samples.finishing.length,
              'bg-purple-500'
            )}
            {renderSectionButton(
              'qa',
              'Should be in QA',
              samples.qa.length,
              'bg-green-500'
            )}
            {renderSectionButton(
              'danger',
              'Danger Zone',
              samples.danger.length,
              'bg-red-500',
              true
            )}
          </div>
        </div>

        {/* Right side content area */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          {selectedSection ? (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">
                {selectedSection === 'newReceipts' && 'New Receipts Today'}
                {selectedSection === 'cutting' && 'Should be in Cutting'}
                {selectedSection === 'sewing' && 'Should be in Sewing'}
                {selectedSection === 'finishing' && 'Should be in Finishing'}
                {selectedSection === 'qa' && 'Should be in QA'}
                {selectedSection === 'danger' && 'Danger Zone - Over 7 Days'}
                {' '}({samples[selectedSection].length})
              </h2>
              {renderSampleList(samples[selectedSection], selectedSection)}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a section to view samples
            </div>
          )}
        </div>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
} 