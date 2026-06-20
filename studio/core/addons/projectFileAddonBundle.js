import {
  colecoBitmapTablesToImageData,
  imageFileToColecoBitmapTables,
  imageFileToPictureProjectFileEntries,
  patternBytesToColecoBitmapTables,
  colorBytesToColecoBitmapTables,
  grpBytesToColecoBitmapTables,
  sc2BytesToColecoBitmapTables,
  isIcvGmDatText,
  icvgmDatTextToColecoTileTables,
  icvgmDatTextToColecoBitmapTables,
  pcBytesToColecoBitmapTables,
  pcFileToPictureProjectFileEntries,
  powerPaintBytesToColecoBitmapTables,
  powerPaintFileToPictureProjectFileEntries
} from "../pictureConvert.js";
import {
  buildPictureProjectFileEntriesFromCandidate,
  evaluatePictureCompressionCandidates,
  PICTURE_QUICK_COMPRESSION_CODECS,
  selectPictureCompressionCandidate
} from "../pictureCompressionReport.js";
import { isPictureProjectFile, pictureComponentFromPath, previewPictureProjectFile } from "../picturePreview.js";

export function createProjectFileAddonBundle() {
  return {
    buildPictureProjectFileEntriesFromCandidate,
    evaluatePictureCompressionCandidates,
    selectPictureCompressionCandidate,
    pictureQuickCompressionCodecs: PICTURE_QUICK_COMPRESSION_CODECS,
    imageFileToColecoBitmapTables,
    colecoBitmapTablesToImageData,
    imageFileToPictureProjectFileEntries,
    patternBytesToColecoBitmapTables,
    colorBytesToColecoBitmapTables,
    grpBytesToColecoBitmapTables,
    sc2BytesToColecoBitmapTables,
    isIcvGmDatText,
    icvgmDatTextToColecoTileTables,
    icvgmDatTextToColecoBitmapTables,
    pcBytesToColecoBitmapTables,
    pcFileToPictureProjectFileEntries,
    powerPaintBytesToColecoBitmapTables,
    powerPaintFileToPictureProjectFileEntries,
    isPictureProjectFile,
    pictureComponentFromPath,
    previewPictureProjectFile
  };
}
