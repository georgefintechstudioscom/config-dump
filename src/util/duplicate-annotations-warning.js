/**
 * Prints a console warning to expose duplicate nerTags are appearing
 *
 * @param {NERAnnotation[]} nerTags
 * @return {Array<NERAnnotation[]>}
 */
function duplicateAnnotationsWarning(nerTags) {
  const annotationsObj = {};
  nerTags.forEach((nerTag) => {
    const startIndex = nerTag.textLocation.start;
    if (!annotationsObj[startIndex]) {
      annotationsObj[startIndex] = [nerTag];
    } else {
      annotationsObj[startIndex].push(nerTag);
    }
  });

  const dupAnnotations = [];
  Object.keys(annotationsObj).forEach((uniqueStartIndex) => {
    if (annotationsObj[uniqueStartIndex].length > 1) {
      dupAnnotations.push(annotationsObj[uniqueStartIndex]);
    }
  });
  return dupAnnotations;
}

module.exports = duplicateAnnotationsWarning;
