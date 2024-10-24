import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Sample } from '../types/sample';

interface SamplingProgramSheetProps {
  sample: Sample;
  firstName: string | undefined;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  header: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 10,
    textAlign: 'right',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColLeft: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColRight: {
    width: '60%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColThird: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellLeft: {
    margin: 4,
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableCellValue: {
    margin: 4,
    fontSize: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tableCellRight: {
    margin: 4,
    fontSize: 8,
    fontStyle: 'italic',    
  },
  // New styles for the four-column section
  fourColumnCell: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fourColumnHeader: {
    margin: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fourColumnValue: {
    margin: 4,
    fontSize: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tallRow: {
    height: '2in',
  },
});

const TableRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.tableRow}>
    <View style={styles.tableColLeft}>
      <Text style={styles.tableCellLeft}>{label}</Text>
    </View>
    <View style={styles.tableColRight}>
      <Text style={styles.tableCellRight}>{value}</Text>
    </View>
  </View>
);

const FourColumnHeader = ({ labels }: { labels: string[] }) => (
  <View style={[styles.tableRow]}>
    {labels.map((label) => (
      <View key={label} style={styles.fourColumnCell}>
        <Text style={styles.fourColumnHeader}>{label}</Text>
      </View>
    ))}
  </View>
);

const FourColumnRow = ({ labels }: { labels: string[] }) => (
  <View style={[styles.tableRow, styles.tallRow]}>
    {labels.map((label, index) => (
      <View key={index} style={styles.fourColumnCell}>
        <Text style={styles.fourColumnValue}>{label}</Text>
      </View>
    ))}
  </View>
);

// Add this function to format the date
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const SamplingProgramSheet: React.FC<SamplingProgramSheetProps> = ({ sample, firstName }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Sampling Program Sheet   ---   {sample.sampleId}</Text>
        <Text style={styles.date}>{formatDate(new Date())}</Text>
      </View>
      <View style={styles.table}>
        <TableRow label="MERCHANT" value={firstName || 'N/A'} />
        <TableRow label="STYLE" value={sample.style} />
        <TableRow label="DESCRIPTION" value="" />
        <TableRow label="BUYER" value={sample.buyer} />
        <TableRow label="TYPE" value={sample.typeOfSample} />
        <TableRow label="NO. OF SAMPLES REQUIRED" value={sample.noOfPieces.toString()} />
        <TableRow label="PATTERN#" value={sample.patternNo} />
        <TableRow label="SHRINKAGE" value="" />
        <TableRow label="SIZE" value={sample.size} />
        <TableRow label="WASH TYPE" value={sample.washType} />
        <FourColumnHeader
          labels={["BODY FABRIC", "THREAD", "BUTTON", "INTERLINING CODE"]}
        />
        <FourColumnRow 
          labels={[sample.typeOfFabric, "", "", ""]}
        />
        <FourColumnRow 
          labels={["", "", "", ""]}
        />
        <FourColumnRow 
          labels={["", "", "", ""]}
        />
        <FourColumnRow 
          labels={["", "", "", ""]}
        />
      </View>
    </Page>
  </Document>
);

export default SamplingProgramSheet;
