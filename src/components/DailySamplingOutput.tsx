'use client';

import { useState, useEffect } from 'react';
import { getDocuments, addDocument, updateDocument } from '../lib/firebase/firebaseUtils';
import { format } from 'date-fns';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { Button } from './ui/button';
import Alert from './Alert';
import { useAuth } from '../lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
  tailorCounts?: {
    [date: string]: number;
  };
}

interface Sample {
  id: string;
  sampleId: string;
  buyerId: string;
  style: string;
  color: string;
  typeOfSample: string;
  fabricTrimsReceiptDate: string;
  status: string;
  noOfPieces: number;
  isArchived: boolean;
  fabricCategory: string;
  changeTracking?: {
    archived?: {
      timestamp: string;
      name: string;
    };
  };
}

interface PendingSampleCount {
  FIT: number;
  PP: number;
  GPT: number;
  SMS: number;
  Other: number;
}

interface DailyOutput {
  CUT: number;
  SEW: number;
  FINISH: number;
  ALTER: number;
  PASS: number;
  REJECT: number;
}

interface SampleTypeOutput {
  FIT: DailyOutput;
  PP: DailyOutput;
  GPT: DailyOutput;
  SMS: DailyOutput;
  Other: DailyOutput;
}

interface SampleOutput {
  sampleId: string;
  CUT: number;
  SEW: number;
  FINISH: number;
  ALTER: number;
  PASS: number;
  REJECT: number;
}

interface GroupedSamples {
  [key: string]: Sample[];
}

interface StoredSampleOutput {
  id?: string;
  date: string;
  buyerId: string;
  outputs: {
    [sampleId: string]: {
      CUT: number;
      SEW: number;
      FINISH: number;
      ALTER: number;
      PASS: number;
      REJECT: number;
    };
  };
}

interface PreviousOutput {
  date: string;
  buyerId: string;
  outputs: {
    [sampleId: string]: {
      CUT: number;
      SEW: number;
      FINISH: number;
      ALTER: number;
      PASS: number;
      REJECT: number;
    };
  };
}

const defaultDailyOutput: DailyOutput = {
  CUT: 0,
  SEW: 0,
  FINISH: 0,
  ALTER: 0,
  PASS: 0,
  REJECT: 0,
};

const defaultSampleTypeOutput: SampleTypeOutput = {
  FIT: { ...defaultDailyOutput },
  PP: { ...defaultDailyOutput },
  GPT: { ...defaultDailyOutput },
  SMS: { ...defaultDailyOutput },
  Other: { ...defaultDailyOutput },
};

export default function DailySamplingOutput() {
  const { userData } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBuyer, setSelectedBuyer] = useState<string>('');
  const [fabricCategoryFilter, setFabricCategoryFilter] = useState<'All' | 'Knit' | 'Woven'>('All');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [pendingSamples, setPendingSamples] = useState<PendingSampleCount>({
    FIT: 0,
    PP: 0,
    GPT: 0,
    SMS: 0,
    Other: 0,
  });
  const [outputs, setOutputs] = useState<SampleTypeOutput>(defaultSampleTypeOutput);
  const [loading, setLoading] = useState(true);
  const [groupedSamples, setGroupedSamples] = useState<GroupedSamples>({});
  const [sampleOutputs, setSampleOutputs] = useState<{ [key: string]: SampleOutput }>({});
  const [isSaving, setIsSaving] = useState<{ [key: string]: boolean }>({});
  const [tailorsAssigned, setTailorsAssigned] = useState<number>(0);
  const [isSavingTailors, setIsSavingTailors] = useState(false);
  const [totalSewnPieces, setTotalSewnPieces] = useState<{ [sampleId: string]: number }>({});
  const [alert, setAlert] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const canSave = userData && (userData.isAdmin || userData.team === 'Sampling');

  useEffect(() => {
      const fetchBuyers = async () => {
      const buyersData = await getDocuments('buyer') as Buyer[];
      setBuyers(buyersData);
      if (selectedBuyer && selectedDate) {
        const selectedBuyerData = buyersData.find(b => b.buyerId === selectedBuyer);
        if (selectedBuyerData?.tailorCounts?.[selectedDate]) {
          setTailorsAssigned(selectedBuyerData.tailorCounts[selectedDate]);
        } else {
          setTailorsAssigned(0);
        }
      }
      setLoading(false);
    };
    fetchBuyers();
  }, [selectedBuyer, selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBuyer || !selectedDate) return;

      const samples = await getDocuments('samples') as Sample[];
      const grouped: GroupedSamples = {
        FIT: [],
        PP: [],
        GPT: [],
        SMS: [],
        Other: []
      };

      const pendingCounts: PendingSampleCount = {
        FIT: 0,
        PP: 0,
        GPT: 0,
        SMS: 0,
        Other: 0
      };

      const allOutputs = await getDocuments('dailySamplingOutputs') as PreviousOutput[];
      const previousOutputs = allOutputs.filter(
        output => output.buyerId === selectedBuyer && output.date < selectedDate
      );

      const totalSewnPieces: { [sampleId: string]: number } = {};
      previousOutputs.forEach(output => {
        Object.entries(output.outputs).forEach(([sampleId, sampleOutput]) => {
          totalSewnPieces[sampleId] = (totalSewnPieces[sampleId] || 0) + sampleOutput.SEW;
        });
      });
      setTotalSewnPieces(totalSewnPieces);
      samples.forEach(sample => {
        if (
          sample.buyerId === selectedBuyer &&
          sample.fabricTrimsReceiptDate &&
          sample.fabricTrimsReceiptDate <= selectedDate &&
          ((sample.isArchived === undefined || sample.isArchived === false) || 
            (sample.changeTracking?.archived?.timestamp && 
             sample.changeTracking.archived.timestamp.split('T')[0] >= selectedDate)) &&
          (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)
        ) {
          const sampleType = getSampleType(sample.typeOfSample);
          grouped[sampleType].push(sample);
          
          const previouslySewn = totalSewnPieces[sample.sampleId] || 0;
          const remainingPieces = Math.max(0, Number(sample.noOfPieces || 0) - previouslySewn);
          pendingCounts[sampleType] += remainingPieces;
        }
      });

      const existingOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const dailyOutput = existingOutputs.find(
        output => output.date === selectedDate && output.buyerId === selectedBuyer
      );

      if (dailyOutput) {
        const savedOutputs: { [key: string]: SampleOutput } = {};
        Object.values(grouped).flat().forEach(sample => {
          savedOutputs[sample.sampleId] = {
            sampleId: sample.sampleId,
            ...dailyOutput.outputs[sample.sampleId] || defaultDailyOutput
          };
        });
        setSampleOutputs(savedOutputs);
      } else {
        const newOutputs: { [key: string]: SampleOutput } = {};
        Object.values(grouped).flat().forEach(sample => {
          newOutputs[sample.sampleId] = {
            sampleId: sample.sampleId,
            ...defaultDailyOutput
          };
        });
        setSampleOutputs(newOutputs);
      }

      setGroupedSamples(grouped);
      setPendingSamples(pendingCounts);
    };

    fetchData();
  }, [selectedBuyer, selectedDate, fabricCategoryFilter]);

  const getSampleType = (type: string): keyof PendingSampleCount => {
    if (type === 'FIT') return 'FIT';
    if (type === 'PP') return 'PP';
    if (type === 'GPT') return 'GPT';
    if (type === 'SMS/SRS/PA/COLOUR RUN') return 'SMS';
    return 'Other';
  };

  const handleOutputChange = (
    sampleType: keyof SampleTypeOutput,
    stage: keyof DailyOutput,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setOutputs(prev => ({
      ...prev,
      [sampleType]: {
        ...prev[sampleType],
        [stage]: numValue,
      },
    }));
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const handleSampleOutputChange = (
    sampleId: string,
    stage: keyof DailyOutput,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setSampleOutputs(prev => ({
      ...prev,
      [sampleId]: {
        ...prev[sampleId],
        sampleId,
        [stage]: numValue
      }
    }));
  };

  const saveSampleTypeOutputs = async (sampleType: string) => {
    setIsSaving(prev => ({ ...prev, [sampleType]: true }));
    try {
      const samplesToSave = groupedSamples[sampleType];
      
      const existingOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const existingOutput = existingOutputs.find(
        output => output.date === selectedDate && output.buyerId === selectedBuyer
      );

      const outputsData: { [sampleId: string]: DailyOutput } = {};
      samplesToSave.forEach(sample => {
        outputsData[sample.sampleId] = sampleOutputs[sample.sampleId] || defaultDailyOutput;
      });

      if (existingOutput?.id) {
        await updateDocument('dailySamplingOutputs', existingOutput.id, {
          outputs: {
            ...existingOutput.outputs,
            ...outputsData
          }
        });
      } else {
        await addDocument('dailySamplingOutputs', {
          date: selectedDate,
          buyerId: selectedBuyer,
          outputs: outputsData
        });
      }

      setAlert({
        show: true,
        message: `Saved outputs for ${sampleType} samples`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving outputs:', error);
      setAlert({
        show: true,
        message: 'Error saving outputs',
        type: 'error'
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [sampleType]: false }));
    }
  };

  const saveAllOutputs = async () => {
    setIsSaving(prev => ({ ...prev, all: true }));
    try {
      const existingOutputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];
      const existingOutput = existingOutputs.find(
        output => output.date === selectedDate && output.buyerId === selectedBuyer
      );

      const outputsData: { [sampleId: string]: DailyOutput } = {};
      Object.values(groupedSamples).flat().forEach(sample => {
        outputsData[sample.sampleId] = sampleOutputs[sample.sampleId] || defaultDailyOutput;
      });

      if (existingOutput?.id) {
        await updateDocument('dailySamplingOutputs', existingOutput.id, {
          outputs: {
            ...existingOutput.outputs,
            ...outputsData
          }
        });
      } else {
        await addDocument('dailySamplingOutputs', {
          date: selectedDate,
          buyerId: selectedBuyer,
          outputs: outputsData
        });
      }

      const selectedBuyerDoc = buyers.find(b => b.buyerId === selectedBuyer);
      if (selectedBuyerDoc?.id) {
        await updateDocument('buyer', selectedBuyerDoc.id, {
          tailorCounts: {
            ...(selectedBuyerDoc.tailorCounts || {}),
            [selectedDate]: tailorsAssigned
          }
        });
      }

      setAlert({
        show: true,
        message: 'Saved all outputs successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving all outputs:', error);
      setAlert({
        show: true,
        message: 'Error saving all outputs',
        type: 'error'
      });
    } finally {
      setIsSaving(prev => ({ ...prev, all: false }));
    }
  };

  const handleTailorsChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setTailorsAssigned(numValue);
  };

  const saveTailorsAssigned = async () => {
    setIsSavingTailors(true);
    try {
      const selectedBuyerDoc = buyers.find(b => b.buyerId === selectedBuyer);
      if (!selectedBuyerDoc?.id) return;

      await updateDocument('buyer', selectedBuyerDoc.id, {
        tailorCounts: {
          ...(selectedBuyerDoc.tailorCounts || {}),
          [selectedDate]: tailorsAssigned
        }
      });

      setAlert({
        show: true,
        message: 'Saved tailors assigned successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving tailors assigned:', error);
      setAlert({
        show: true,
        message: 'Error saving tailors assigned',
        type: 'error'
      });
    } finally {
      setIsSavingTailors(false);
    }
  };

  const getStatusBadge = (sample: Sample) => {
    if (sample.isArchived && sample.changeTracking?.archived?.timestamp) {
      const archiveDate = format(new Date(sample.changeTracking.archived.timestamp), 'dd/MM/yyyy');
      if (sample.changeTracking.archived.timestamp.split('T')[0] > selectedDate) {
        return (
          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full inline-block">
            Archived on {archiveDate}
          </div>
        );
      }
    } else if (sample.status === 'Garment Ready' || sample.status === 'Dispatched') {
      return (
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
          {sample.status}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen p-6">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex items-center mb-4">
        <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
          <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold">Daily Sampling Output</h1>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Buyer
          </label>
          <select
            value={selectedBuyer}
            onChange={(e) => setSelectedBuyer(e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="">Select a buyer</option>
            {buyers.map((buyer) => (
              <option key={buyer.buyerId} value={buyer.buyerId}>
                {buyer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

        {selectedBuyer && (
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fabric Category
            </label>
            <div className="flex space-x-1">
              {(['All', 'Knit', 'Woven'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setFabricCategoryFilter(category)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    fabricCategoryFilter === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedBuyer && (
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tailors Assigned
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="0"
                value={tailorsAssigned}
                onChange={(e) => handleTailorsChange(e.target.value)}
                onWheel={handleWheel}
                className="w-24 border rounded-md p-2"
              />
              {canSave && (
              <Button
                onClick={saveTailorsAssigned}
                disabled={isSavingTailors}
              >
                  {isSavingTailors ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedBuyer && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Samples</h2>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {Object.entries(pendingSamples).map(([type, count]) => (
              <div key={type} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">{type}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {Object.entries(groupedSamples).map(([sampleType, samples]) => (
              samples.length > 0 && (
                <div key={sampleType} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">{sampleType}</h3>
                    {canSave && (
                      <Button
                        onClick={() => saveSampleTypeOutputs(sampleType)}
                        disabled={isSaving[sampleType]}
                      >
                        {isSaving[sampleType] ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Sample ID
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 w-32">
                            Style
                          </th>
                          {sampleType === 'Other' && (
                            <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 w-32">
                              Sample Type
                            </th>
                          )}
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Receipt Date
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Total Pieces
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Pending Pieces
                          </th>
                          <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                            Status
                          </th>
                          {Object.keys(defaultDailyOutput).map((stage) => (
                            <th key={stage} className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500">
                              {stage}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {samples.map((sample) => (
                          <tr key={sample.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{sample.sampleId}</td>
                            <td className="px-4 py-2 text-sm">
                              <div 
                                className="truncate max-w-[120px]" 
                                title={`${sample.style}${sample.color ? ` - ${sample.color}` : ''}`}
                              >
                                {sample.style}
                              </div>
                            </td>
                            {sampleType === 'Other' && (
                              <td className="px-4 py-2 text-sm">
                                <div className="truncate max-w-[120px]" title={sample.typeOfSample}>
                                  {sample.typeOfSample}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-2 text-sm">
                              {format(new Date(sample.fabricTrimsReceiptDate), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-4 py-2 text-sm">{Number(sample.noOfPieces)}</td>
                            <td className="px-4 py-2 text-sm">
                              {Math.max(0, Number(sample.noOfPieces || 0) - (totalSewnPieces[sample.sampleId] || 0))}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {getStatusBadge(sample)}
                            </td>
                            {Object.keys(defaultDailyOutput).map((stage) => (
                              <td key={stage} className="px-4 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={sample.noOfPieces}
                                  value={sampleOutputs[sample.sampleId]?.[stage as keyof DailyOutput] || 0}
                                  onChange={(e) => handleSampleOutputChange(
                                    sample.sampleId,
                                    stage as keyof DailyOutput,
                                    e.target.value
                                  )}
                                  onWheel={handleWheel}
                                  className="w-16 border rounded-md p-1 text-sm"
                                  disabled={!canSave}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ))}
            
            {Object.values(groupedSamples).some(samples => samples.length > 0) && canSave && (
              <div className="flex justify-end mt-6">
                <Button
                  onClick={saveAllOutputs}
                  disabled={isSaving.all}
                  className="bg-primary text-white"
                >
                  {isSaving.all ? 'Saving All...' : 'Save All'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {alert.show && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
} 