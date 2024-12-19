"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getDocuments,
  deleteDocument,
  updateDocument,
} from "../lib/firebase/firebaseUtils";
import SampleDetails from "./SampleDetails";
import Portal from "./Portal";
import { useAuth } from "../lib/hooks/useAuth";
import {
  SAMPLE_TYPE_OPTIONS,
  STATUS_OPTIONS,
  SEASON_OPTIONS,
  PATTERN_STATUS_OPTIONS,
} from "../lib/constants";
import SampleForm from "./SampleForm";
import { Edit, Copy, Trash2, ArrowUp, ArrowDown, MessageSquare, Archive, BarChart } from "lucide-react";
import RemarkModal from "./RemarkModal";
import ProductionSummaryModal from "./ProductionSummaryModal";

interface ChangeInfo {
  name: string;
  timestamp: string;
}

interface Sample {
  id: string;
  sampleId: string;
  timestamp: string;
  status: string;
  samplePriorityNo: string;
  patternNo: string; // New field
  patternStatus: string;
  buyerRequestDate: string;
  buyer: string;
  buyerId: string;
  style: string;
  season: string;
  typeOfSample: string;
  color: string; // New field
  size: string; // Add this line
  washType: string; // Add this line
  noOfPieces: number;
  typeOfFabric: string;
  requiredFabricQty: number;
  procuredFabricQtyIssued: number;
  stockFabricQtyIssued: number;
  fabricIssueDate: string;
  fabricTrimsReceiptDate: string;
  fabricRejectQty: number; // Add this line
  requiredCompletionDate: string;
  expectedCompletionDate: string;
  actualSampleReceivedDate: string;
  changeTracking: {
    [key: string]: ChangeInfo;
  };
  remarks: string[];
  isArchived: boolean; // Add this field
}

interface SampleListProps {
  refreshTrigger: number;
  onSampleUpdated: () => void;
  clearFiltersFlag: boolean;
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
}

const ChevronDownIcon = () => (
  <svg
    className="w-4 h-4 ml-1 inline-block"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear().toString().slice(-2)} @ ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear().toString().slice(-2)}`;
}

const SampleList: React.FC<SampleListProps> = ({
  refreshTrigger,
  onSampleUpdated,
  clearFiltersFlag,
}) => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState({
    buyer: "",
    typeOfSample: "",
    status: "",
    style: "",
    patternStatus: "", // Add this line
  });
  const [styleSearch, setStyleSearch] = useState("");
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const { userData } = useAuth();
  const [styleDropdownPosition, setStyleDropdownPosition] = useState({
    top: 0,
    left: 0,
  });
  const styleButtonRef = useRef<HTMLButtonElement>(null);

  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [duplicatingSample, setDuplicatingSample] = useState<Sample | null>(
    null,
  );

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "timestamp",
    direction: "asc",
  });

  const [selectedSampleForRemarks, setSelectedSampleForRemarks] = useState<string | null>(null);

  const [buyers, setBuyers] = useState<Buyer[]>([]);

  const [archiveConfirmation, setArchiveConfirmation] = useState<string | null>(null);

  const [selectedSampleForProduction, setSelectedSampleForProduction] = useState<string | null>(null);

  const [buyerSearch, setBuyerSearch] = useState("");

  const filteredBuyers = useMemo(() => {
    return buyers
      .map(b => b.name)
      .filter((buyer) =>
        buyer && buyerSearch
          ? buyer.toLowerCase().includes(buyerSearch.toLowerCase())
          : true
      )
      .sort((a, b) => (a && b ? a.localeCompare(b) : 0));
  }, [buyers, buyerSearch]);

  const fetchSamples = useCallback(async () => {
    const fetchedSamples = await getDocuments("samples");
    setSamples(fetchedSamples as Sample[]);
  }, []);

  useEffect(() => {
    fetchSamples();
    fetchBuyers();
  }, [fetchSamples, refreshTrigger]);

  const fetchBuyers = async () => {
    const buyersData = await getDocuments('buyer');
    setBuyers(buyersData as Buyer[]);
  };

  useEffect(() => {
    const filteredAndSortedSamples = samples
      .filter((sample) => {
        return (
          !sample.isArchived && // Add this condition
          (filters.buyer === "" || sample.buyer === filters.buyer) &&
          (filters.typeOfSample === "" ||
            sample.typeOfSample === filters.typeOfSample) &&
          (filters.status === "" || sample.status === filters.status) &&
          (filters.style === "" || sample.style === filters.style) &&
          (filters.patternStatus === "" || sample.patternStatus === filters.patternStatus) // Add this line
        );
      })
      .sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Sample];
        const bValue = b[sortConfig.key as keyof Sample];

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });

    setFilteredSamples(filteredAndSortedSamples);
  }, [samples, sortConfig, filters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveFilter(null);
      }
      if (
        styleDropdownRef.current &&
        !styleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStyleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (clearFiltersFlag) {
      setFilters({
        buyer: "",
        typeOfSample: "",
        status: "",
        style: "",
        patternStatus: "",
      });
      setStyleSearch("");
    }
  }, [clearFiltersFlag]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      await deleteDocument("samples", deleteConfirmation);
      fetchSamples();
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const handleRowClick = (id: string) => {
    setSelectedSample(id);
  };

  const handleCloseEdit = () => {
    setSelectedSample(null);
    onSampleUpdated();
  };

  const handleFilterClick = (filterName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
    setActiveFilter((prevFilter) =>
      prevFilter === filterName ? null : filterName,
    );
    setIsStyleDropdownOpen(false); // Close style dropdown when opening other dropdowns
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setActiveFilter(null);
    if (filterName === "style") {
      setIsStyleDropdownOpen(false);
      setStyleSearch("");
    }
  };

  const handleStyleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setStyleSearch(e.target.value);
  };

  const filteredStyles = useMemo(() => {
    const uniqueStyles = Array.from(
      new Set(samples.map((sample) => sample.style || ''))
    );
    return uniqueStyles
      .filter((style) =>
        style && styleSearch
          ? style.toLowerCase().includes(styleSearch.toLowerCase())
          : true
      )
      .sort((a, b) => (a && b ? a.localeCompare(b) : 0));
  }, [samples, styleSearch]);

  const FilterDropdown = ({
    options,
    filterName,
  }: {
    options: string[];
    filterName: string;
  }) => (
    <div
      ref={filterDropdownRef}
      style={{
        position: "absolute",
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        zIndex: 1000,
      }}
      className="w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 max-h-60 overflow-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {filterName === "buyer" && (
        <div className="p-2">
          <input
            type="text"
            value={buyerSearch}
            onChange={(e) => setBuyerSearch(e.target.value)}
            placeholder="Search buyers..."
            className="w-full p-2 border rounded"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div
        className="py-1"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="options-menu"
      >
        <div
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          onClick={() => handleFilterChange(filterName, "")}
        >
          All
        </div>
        {filterName === "buyer" 
          ? filteredBuyers.map((option) => (
              <div
                key={option}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                onClick={() => handleFilterChange(filterName, option)}
              >
                {option}
              </div>
            ))
          : options.map((option) => (
              <div
                key={option}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                onClick={() => handleFilterChange(filterName, option)}
              >
                {option}
              </div>
            ))
        }
      </div>
    </div>
  );

  const clearAllFilters = () => {
    setFilters({
      buyer: "",
      typeOfSample: "",
      status: "",
      style: "",
      patternStatus: "", // Add this line
    });
  };

  const handleCellClick = (id: string, field: string, value: string) => {
    const editableFields = [
      "status",
      "samplePriorityNo",
      "buyerRequestDate",
      "buyer",
      "style",
      "season",
      "typeOfSample",
      "noOfPieces",
      "typeOfFabric",
      "requiredFabricQty",
      "procuredFabricQtyIssued",
      "stockFabricQtyIssued",
      "fabricIssueDate",
      "fabricTrimsReceiptDate",
      "requiredCompletionDate",
      "expectedCompletionDate",
      "actualSampleReceivedDate",
      "patternNo",
      "color",
      "patternStatus",
      "fabricRejectQty",
      "size",
      "washType",
    ];

    if (editableFields.includes(field)) {
      setEditingCell({ id, field });
      setEditValue(value || "");
    }
  };

  const handleCellChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setEditValue(e.target.value);
  };

  const handleCellBlur = async () => {
    if (editingCell) {
      await saveCellEdit();
    }
  };

  const handleCellKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      await saveCellEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const saveCellEdit = async () => {
    if (editingCell && userData) {
      const { id, field } = editingCell;
      const sample = samples.find((s) => s.id === id);
      
      // Check if this is a date field
      const isDateField = field.includes('Date');
      
      // For date fields, only prevent saving if:
      // - Current value is empty AND new value is empty
      if (isDateField && !editValue && !sample?.[field as keyof Sample]) {
        setEditingCell(null);
        return;
      }

      // Only proceed if there's actually a change
      if (sample && sample[field as keyof Sample] !== editValue) {
        try {
          const changeInfo: ChangeInfo = {
            name: userData.firstName,
            timestamp: new Date().toISOString(),
          };
          const updateData = {
            [field]: editValue,
            changeTracking: {
              ...sample.changeTracking,
              [field]: changeInfo,
            },
          };
          await updateDocument("samples", id, updateData);
          const updatedSamples = samples.map((s) =>
            s.id === id ? { ...s, ...updateData } : s,
          );
          setSamples(updatedSamples);
          onSampleUpdated();
        } catch (error) {
          console.error("Error updating sample:", error);
        }
      }
      setEditingCell(null);
    }
  };

  const renderCell = (sample: Sample, field: string) => {
    const isEditing = editingCell?.id === sample.id && editingCell?.field === field;
    const value = sample[field as keyof Sample] || "";

    if (isEditing) {
      if (field === "buyer") {
        return (
          <select
            value={editValue}
            onChange={(e) => {
              const selectedBuyer = buyers.find(b => b.name === e.target.value);
              if (selectedBuyer) {
                handleCellChange(e);
                // Update buyerId when buyer is changed
                updateDocument("samples", sample.id, { 
                  buyer: selectedBuyer.name, 
                  buyerId: selectedBuyer.buyerId 
                });
              }
            }}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          >
            <option value="">Select a buyer</option>
            {buyers.map((buyer) => (
              <option key={buyer.buyerId} value={buyer.name}>
                {buyer.name}
              </option>
            ))}
          </select>
        );
      } else if (field === "typeOfSample") {
        return (
          <select
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          >
            <option value="">Select sample type</option>
            {SAMPLE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else if (field === "status") {
        return (
          <select
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          >
            <option value="">Select status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else if (field === "season") {
        return (
          <select
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          >
            <option value="">Select a season</option>
            {SEASON_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else if (field.includes("Date")) {
        return (
          <input
            type="date"
            value={editValue.split("T")[0]} // Extract date part from ISO string
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          />
        );
      } else if (field === 'patternStatus') {
        return (
          <select
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          >
            <option value="">Select pattern status</option>
            {PATTERN_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      } else if (field === 'fabricRejectQty' || field === 'noOfPieces' || field === 'requiredFabricQty' || field === 'procuredFabricQtyIssued' || field === 'stockFabricQtyIssued') {
        return (
          <input
            type="number"
            min="0"
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            onWheel={handleWheel}
            className="w-full p-1 border rounded"
            autoFocus
          />
        );
      } else {
        return (
          <input
            type="text"
            value={editValue}
            onChange={handleCellChange}
            onBlur={handleCellBlur}
            onKeyDown={handleCellKeyDown}
            className="w-full p-1 border rounded"
            autoFocus
          />
        );
      }
    } else {
      // Format timestamp and other date fields when rendering
      if (field === "timestamp") {
        return formatTimestamp(value as string);
      } else if (
        field === "buyerRequestDate" ||
        field === "fabricIssueDate" ||
        field === "fabricTrimsReceiptDate" ||
        field === "requiredCompletionDate" ||
        field === "expectedCompletionDate" ||
        field === "actualSampleReceivedDate"
      ) {
        return (
          <div
            onClick={() => {
              const stringValue =
                typeof value === "string" ? value : JSON.stringify(value);
              handleCellClick(sample.id, field, stringValue);
            }}
            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
          >
            {formatDate(value as string)}
          </div>
        );
      }

      // Add cases for the new fields
      if (field === 'size' || field === 'washType') {
        return (
          <div
            onClick={() => handleCellClick(sample.id, field, sample[field] || '')}
            className={`cursor-pointer hover:bg-gray-100 p-1 rounded ${!sample[field] ? "h-8" : ""}`}
          >
            {sample[field] || "\u00A0"}
          </div>
        );
      }

      return (
        <div
          onClick={() =>
            handleCellClick(
              sample.id,
              field,
              typeof value === "string" ? value : JSON.stringify(value),
            )
          }
          className={`cursor-pointer hover:bg-gray-100 p-1 rounded ${!value ? "h-8" : ""}`}
        >
          {typeof value === "object"
            ? JSON.stringify(value)
            : value || "\u00A0"}
        </div>
      );
    }
  };

  const handleStyleFilterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (styleButtonRef.current) {
      const rect = styleButtonRef.current.getBoundingClientRect();
      setStyleDropdownPosition({
        top: rect.bottom,
        left: rect.left,
      });
    }
    setIsStyleDropdownOpen((prev) => !prev);
    setActiveFilter(null); // Close other dropdowns when opening style dropdown
  };

  const StyleFilterDropdown = () => (
    <div
      ref={styleDropdownRef}
      style={{
        position: "fixed",
        top: `${styleDropdownPosition.top}px`,
        left: `${styleDropdownPosition.left}px`,
        zIndex: 1000,
      }}
      className="w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 max-h-60 overflow-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        <input
          type="text"
          value={styleSearch}
          onChange={handleStyleSearch}
          placeholder="Search styles..."
          className="w-full p-2 border rounded"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div
        className="py-1"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="options-menu"
      >
        <div
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
          onClick={() => handleFilterChange("style", "")}
        >
          All Styles
        </div>
        {filteredStyles.map((style) => (
          <div
            key={style}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            onClick={() => handleFilterChange("style", style)}
          >
            {style}
          </div>
        ))}
      </div>
    </div>
  );

  const handleDuplicate = (sample: Sample) => {
    setDuplicatingSample(sample);
  };

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const handleRemarkClick = (sampleId: string) => {
    setSelectedSampleForRemarks(sampleId);
  };

  const handleArchive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setArchiveConfirmation(id);
  };

  const confirmArchive = async () => {
    if (archiveConfirmation && userData) {
      try {
        const sample = samples.find(s => s.id === archiveConfirmation);
        if (sample) {
          const changeInfo: ChangeInfo = {
            name: userData.firstName,
            timestamp: new Date().toISOString()
          };

          await updateDocument('samples', archiveConfirmation, { 
            isArchived: true,
            changeTracking: {
              ...sample.changeTracking,
              archived: changeInfo
            }
          });
          
          fetchSamples();
          onSampleUpdated();
        }
      } catch (error) {
        console.error('Error archiving sample:', error);
      }
      setArchiveConfirmation(null);
    }
  };

  const cancelArchive = () => {
    setArchiveConfirmation(null);
  };

  useEffect(() => {
    if (!activeFilter) {
      setBuyerSearch("");
    }
  }, [activeFilter]);

  return (
    <div className="h-full overflow-hidden">
      <div className="overflow-x-auto h-full">
        <div className="overflow-y-auto h-full border-b border-gray-300">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal sticky top-0 z-30">
              <tr>
                <th className="py-3 px-6 text-left sticky left-0 bg-gray-200 z-40 w-[140px]">
                  <button
                    onClick={() => handleSort("timestamp")}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Sample ID
                    {sortConfig.key === "timestamp" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp size={20} />
                      ) : (
                        <ArrowDown size={20} />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-6 text-left sticky left-[169px] bg-gray-200 z-40 w-[140px]">
                  <button
                    ref={styleButtonRef}
                    onClick={handleStyleFilterClick}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Style {filters.style && `(${filters.style})`}
                    <ChevronDownIcon />
                  </button>
                </th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={(e) => handleFilterClick("buyer", e)}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Buyer {filters.buyer && `(${filters.buyer})`}
                    <ChevronDownIcon />
                  </button>
                </th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={(e) => handleFilterClick("status", e)}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Status {filters.status && `(${filters.status})`}
                    <ChevronDownIcon />
                  </button>
                </th>
                
                <th className="py-3 px-6 text-left">Pattern No.</th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={(e) => handleFilterClick("patternStatus", e)}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Pattern Status {filters.patternStatus && `(${filters.patternStatus})`}
                    <ChevronDownIcon />
                  </button>
                </th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={(e) => handleFilterClick("typeOfSample", e)}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Type of Sample{" "}
                    {filters.typeOfSample && `(${filters.typeOfSample})`}
                    <ChevronDownIcon />
                  </button>
                </th>
                <th className="py-3 px-6 text-left">No. of Pieces</th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={() => handleSort("fabricTrimsReceiptDate")}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Fabric and Trims Receipt Date
                    {sortConfig.key === "fabricTrimsReceiptDate" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp size={40} className="ml-1" />
                      ) : (
                        <ArrowDown size={40} className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={() => handleSort("requiredCompletionDate")}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Required Completion Date
                    {sortConfig.key === "requiredCompletionDate" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp size={40} className="ml-1" />
                      ) : (
                        <ArrowDown size={40} className="ml-1" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={() => handleSort("expectedCompletionDate")}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Expected Completion Date
                    {sortConfig.key === "expectedCompletionDate" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp size={40} />
                      ) : (
                        <ArrowDown size={40} />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={() => handleSort("actualSampleReceivedDate")}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Actual Sample Received Date
                    {sortConfig.key === "actualSampleReceivedDate" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp size={40} />
                      ) : (
                        <ArrowDown size={40} />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-6 text-left">Sample Priority No.</th>
                
                
                <th className="py-3 px-6 text-left">Season</th>
                
                <th className="py-3 px-6 text-left">Type of Fabric</th>
                <th className="py-3 px-6 text-left">Color</th>
                <th className="py-3 px-6 text-left">Size</th>
                <th className="py-3 px-6 text-left">Wash Type</th>
                
                <th className="py-3 px-6 text-left">Required Fabric Qty</th>
                <th className="py-3 px-6 text-left">Procured Fabric Qty Issued</th>
                <th className="py-3 px-6 text-left">Stock Fabric Qty Issued</th>
                <th className="py-3 px-6 text-left">
                  <button
                    onClick={() => handleSort("fabricIssueDate")}
                    className="font-bold hover:text-gray-900 flex items-center"
                  >
                    Fabric Issue Date
                    {sortConfig.key === "fabricIssueDate" &&
                      (sortConfig.direction === "asc" ? (
                        <ArrowUp size={40} className="ml-1" />
                      ) : (
                        <ArrowDown size={40} className="ml-1" />
                      ))}
                  </button>
                </th>
                
                <th className="py-3 px-6 text-left">Fabric Reject Qty</th>
                
                <th className="py-3 px-6 text-center sticky right-0 bg-gray-200 z-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {filteredSamples.length > 0 ? (
                filteredSamples.map((sample) => (
                  <tr
                    key={sample.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-6 text-left whitespace-nowrap sticky left-0 bg-white z-20 w-[140px]">
                      <div>
                        {sample.sampleId}
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(sample.timestamp)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-left sticky left-[169px] bg-white z-20 w-[140px]">
                      {renderCell(sample, "style")}
                    </td>
                    {[
                      "buyer",
                      "status",
                      
                      "patternNo",
                      "patternStatus",
                      "typeOfSample",
                      "noOfPieces",
                      "fabricTrimsReceiptDate",
                      "requiredCompletionDate",
                      "expectedCompletionDate",
                      "actualSampleReceivedDate",
                      "samplePriorityNo",
                      
                      "season",
                      
                      "typeOfFabric",
                      "color",
                      "size",
                      "washType",
                      
                      "requiredFabricQty",
                      "procuredFabricQtyIssued",
                      "stockFabricQtyIssued",
                      "fabricIssueDate",
                      
                      "fabricRejectQty",
                      
                    ].map((field) => (
                      <td key={field} className="py-3 px-6 text-left">
                        {renderCell(sample, field)}
                      </td>
                    ))}
                    <td className="py-3 px-6 text-center sticky right-0 bg-white z-20">
                      <div className="flex justify-center items-center space-x-2">
                        <button
                          onClick={() => setSelectedSample(sample.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(sample)}
                          className="text-green-600 hover:text-green-900"
                          title="Duplicate"
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => handleRemarkClick(sample.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Add Remark"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button
                          onClick={() => setSelectedSampleForProduction(sample.sampleId)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Production Summary"
                        >
                          <BarChart size={18} />
                        </button>
                        {(userData?.isAdmin || userData?.team === 'Merchandising') && (
                          <button
                            onClick={(e) => handleArchive(e, sample.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Archive"
                          >
                            <Archive size={18} />
                          </button>
                        )}
                        {userData?.isAdmin && (
                          <button
                            onClick={(e) => handleDelete(e, sample.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={24} className="py-4 text-center">
                    No samples available. Please add new samples.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selectedSample && (
          <SampleDetails
            sampleId={selectedSample}
            onClose={handleCloseEdit}
            onSampleUpdated={onSampleUpdated}
          />
        )}
        {deleteConfirmation && userData?.isAdmin && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-lg shadow-xl">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete this sample?
              </p>
              <div className="flex justify-end">
                <button
                  onClick={cancelDelete}
                  className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {activeFilter && (
          <FilterDropdown
            options={
              activeFilter === "buyer"
                ? buyers.map(b => b.name)
                : activeFilter === "typeOfSample"
                ? SAMPLE_TYPE_OPTIONS
                : activeFilter === "status"
                ? STATUS_OPTIONS
                : activeFilter === "patternStatus"
                ? PATTERN_STATUS_OPTIONS
                : []
            }
            filterName={activeFilter}
          />
        )}
        {isStyleDropdownOpen && <StyleFilterDropdown />}
        {duplicatingSample && (
          <SampleForm
            onClose={() => setDuplicatingSample(null)}
            onSampleAdded={onSampleUpdated}
            duplicateSample={duplicatingSample}
          />
        )}
        {selectedSampleForRemarks && (
          <RemarkModal
            sampleId={selectedSampleForRemarks}
            onClose={() => setSelectedSampleForRemarks(null)}
            onRemarkAdded={onSampleUpdated}
          />
        )}
        {archiveConfirmation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded-lg shadow-xl">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
                Confirm Archive
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to archive this sample?
              </p>
              <div className="flex justify-end">
                <button
                  onClick={cancelArchive}
                  className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedSampleForProduction && (
          <ProductionSummaryModal
            sampleId={selectedSampleForProduction}
            onClose={() => setSelectedSampleForProduction(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SampleList;
