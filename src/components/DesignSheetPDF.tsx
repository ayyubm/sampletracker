import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Define the styles for our design sheet
const styles = StyleSheet.create({
  page: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    orientation: 'landscape',
  },
  title: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    height: '95%', // Control the overall height
  },
  box: {
    width: '49%',
    height: '48%', // Use percentage height instead of fixed pixels
    border: '1pt solid #000000',
    marginBottom: 8,
    position: 'relative',
  },
  boxContent: {
    flexDirection: 'row',
    padding: 8,
    height: '100%',
  },
  leftSection: {
    width: '50%',
    height: '75%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rightSection: {
    width: '50%',
    paddingLeft: 5,
  },
  sampleImage: {
    maxWidth: '95%',
    maxHeight: '95%',
    objectFit: 'contain',
  },
  noImage: {
    color: '#999999',
    fontSize: 9,
    textAlign: 'center',
  },
  infoBlock: {
    marginTop: 5,
  },
  styleRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  styleLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    width: 60,
  },
  styleValue: {
    fontSize: 8,
    flex: 1,
  },
  sampleStatus: {
    position: 'absolute',
    bottom: 5,
    right: 8,
    flexDirection: 'row',
  },
  sampleStatusLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginRight: 3,
  },
  sampleStatusValue: {
    fontSize: 7,
  },
  sampleETD: {
    position: 'absolute',
    bottom: 5,
    left: 8,
    flexDirection: 'row',
  },
  sampleETDLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginRight: 3,
  },
  sampleETDValue: {
    fontSize: 7,
  },
  fabricSwatch: {
    marginTop: 8,
    width: '80%',
    height: 40,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'center',
  },
  notesContainer: {
    position: 'absolute',
    top: '45%',
    left: '10%',
    backgroundColor: '#ffff99',
    padding: 3,
    width: '25%',
    zIndex: 2,
  },
  notesText: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  handwrittenNote: {
    position: 'absolute',
    top: 3,
    left: 3,
    color: '#666666',
    fontSize: 6,
    transform: 'rotate(-5deg)',
    fontStyle: 'italic',
  },
  buyerHeader: {
    fontSize: 10,
    marginTop: 3,
    marginLeft: 3,
    color: '#555555',
  }
});

// Sample interface 
interface Sample {
  sampleId: string;
  style: string;
  buyer: string;
  color: string;
  patternNo?: string;
  typeOfFabric?: string;
  typeOfSample: string;
  status: string;
  noOfPieces: number;
  requiredCompletionDate: string;
  imageDataURI?: string;
}

interface DesignSheetPDFProps {
  samples: Sample[];
  title: string;
}

const SampleBox = ({ sample }: { sample: Sample }) => (
  <View style={styles.box}>
    {/* Buyer name in the top left */}
    <Text style={styles.buyerHeader}>{sample.buyer}</Text>
    
    <View style={styles.boxContent}>
      {/* Left section with image */}
      <View style={styles.leftSection}>
        {sample.imageDataURI ? (
          <Image src={sample.imageDataURI} style={styles.sampleImage} />
        ) : (
          <Text style={styles.noImage}>No image</Text>
        )}

      </View>
      
      {/* Right section with details */}
      <View style={styles.rightSection}>
        <View style={styles.infoBlock}>
          <View style={styles.styleRow}>
            <Text style={styles.styleLabel}>STYLE:</Text>
            <Text style={styles.styleValue}>{sample.style}</Text>
          </View>
          <View style={styles.styleRow}>
            <Text style={styles.styleLabel}>PATTERN:</Text>
            <Text style={styles.styleValue}>{sample.patternNo || ''}</Text>
          </View>
          <View style={styles.styleRow}>
            <Text style={styles.styleLabel}>FABRIC:</Text>
            <Text style={styles.styleValue}>{sample.typeOfFabric || sample.color || ''}</Text>
          </View>
          
        </View>
      </View>
    </View>
    
    {/* Bottom left - Sample ETD */}
    <View style={styles.sampleETD}>
      <Text style={styles.sampleETDLabel}>SAMPLE ETD:</Text>
      <Text style={styles.sampleETDValue}>
        {sample.requiredCompletionDate ? format(new Date(sample.requiredCompletionDate), 'dd/MM/yy') : ''}
      </Text>
    </View>
    
    {/* Bottom right - Sample Status */}
    <View style={styles.sampleStatus}>
      <Text style={styles.sampleStatusLabel}>SAMPLE STATUS:</Text>
      <Text style={styles.sampleStatusValue}>{sample.status}</Text>
    </View>
  </View>
);

const DesignSheetPDF = ({ samples, title }: DesignSheetPDFProps) => {
  // Calculate how many samples per page (4 per page)
  const SAMPLES_PER_PAGE = 4;
  
  // Get current buyer from the title if it contains "Buyer:"
  const buyerName = title.includes('Buyer:') 
    ? title.split('Buyer:')[1].trim().split(' |')[0].trim()
    : '';
  
  // Create a modified title that matches the screenshot
  const getPageTitle = (pageIndex: number, pageCount: number) => {
    if (buyerName) {
      return `Buyer: ${buyerName} (Page ${pageIndex + 1} of ${pageCount})`;
    }
    return `${title} (Page ${pageIndex + 1} of ${pageCount})`;
  };
  
  // Calculate how many pages we need
  const pageCount = Math.ceil(samples.length / SAMPLES_PER_PAGE);
  
  // Split samples into pages
  const pages = Array.from({ length: pageCount }, (_, i) => {
    const start = i * SAMPLES_PER_PAGE;
    return samples.slice(start, start + SAMPLES_PER_PAGE);
  });

  return (
    <Document>
      {pages.map((pageSamples, pageIndex) => (
        <Page key={`page_${pageIndex}`} size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.title}>{getPageTitle(pageIndex, pageCount)}</Text>
          
          <View style={styles.gridContainer}>
            {pageSamples.map((sample) => (
              <SampleBox key={sample.sampleId} sample={sample} />
            ))}
            
            {/* Add empty boxes if we don't have 4 samples to fill the page */}
            {Array.from({ length: Math.max(0, SAMPLES_PER_PAGE - pageSamples.length) }).map((_, i) => (
              <View key={`empty_${i}`} style={styles.box} />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default DesignSheetPDF; 