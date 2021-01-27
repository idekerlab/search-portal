import React, { useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { CxToJs, CyNetworkUtils } from 'cytoscape-cx2js';
import Cytoscape from 'cytoscape';
import CyCanvas from 'cytoscape-canvas';
import { CxToCyCanvas } from 'cyannotation-cx2js';
import Warning from './Warning';
import { CONCENTRIC_LAYOUT, COSE_LAYOUT } from './LayoutSettings';
import { cloneDeep } from 'lodash';

import './style.css';

export const MAX_NETWORK_SIZE = 5000;

// For supporting visual annotation
Cytoscape.use(CyCanvas);

// This is the global instance of Cytoscape.js
let cyInstance = null;

// For annotation rendering
const annotationRenderer = new CxToCyCanvas(CxToJs);
const utils = new CyNetworkUtils();

// This is the network attributes storing graphical annotations.
const ANNOTATION_TAG = '__Annotations';

// Default network background color
const DEF_BG_COLOR = '#FFFFFF';

/**
 *
 * Simple wrapper for cytoscape.js react component
 *
 * @param props
 * @returns {*}
 * @constructor
 */

const CytoscapeViewer = (props) => {
  const { highlights, fit } = props.uiState;
  const { originalCX } = props.network;
  const cyjs = props.network.network;
  const [originalElements, setOriginalElements] = useState(
    cyjs ? cloneDeep(cyjs.elements) : null
  );

  const PRESET_LAYOUT = {
    name: 'preset',
    padding: 6,
    animate: false,
    positions: function (node) {
      const id = node[0]._private.data.id;
      const analog = originalElements ? originalElements.filter((elem) => {
        return elem.data.id.toString() === id.toString();
      }) : [{position:null}];
      const position = analog[0].position;
      return position;
    },
  };
  const [layout, setLayout] = useState(PRESET_LAYOUT);
  let propLayouts;
  let propLayout;

  // Use default color if this property is not available.
  let backgroundColor = props.network.backgroundColor;
  if (backgroundColor === null || backgroundColor === undefined) {
    backgroundColor = DEF_BG_COLOR;
  }

  const renderAnnotations = () => {
    if (layout.name === 'preset' && originalCX) {
      const networkAttr = originalCX.filter(
        (entry) => entry.networkAttributes !== undefined
      );
      if (networkAttr !== undefined) {
        const firstEntry = networkAttr[0];
        if (firstEntry !== undefined && firstEntry.networkAttributes !== null) {
          const netAttrArray = firstEntry.networkAttributes;
          const annotationEntry = netAttrArray.filter(
            (attr) => attr.n === ANNOTATION_TAG
          );
          if (annotationEntry.length !== 0 && cyInstance) {
            const nice = utils.rawCXtoNiceCX(originalCX);
            console.log(
              '* Registering annotation renderer for this niceCX:',
              annotationEntry
            );
            annotationRenderer.drawAnnotationsFromNiceCX(cyInstance, nice);
            annotationRenderer.drawBackground(cyInstance, backgroundColor);
          }
        }
      }
    }
    return;
  };

  /*
    Node/Edge Selections
   */

  useEffect(() => {
    // Event handler can be set only when Cytoscape.js instance is available.
    if (cyInstance === undefined || cyInstance === null) {
      return;
    }

    // Background tapped: Remove selection
    // (This is the standard Cytosape UX)
    cyInstance.on('tap', function (event) {
      try {
        if (event.target === cyInstance) {
          props.networkActions.unselectEdges();
          props.networkActions.unselectNodes();
        }
      } catch (e) {
        console.warn(e);
      }
    });

    const selectEdge = () => {
      setTimeout(() => {
        const edges = [];
        const selectedEdges = cyInstance.$('edge:selected');
        selectedEdges.forEach((element) => {
          edges.push(element.data());
        });
        if (edges.length === 0) {
          props.networkActions.unselectEdges();
        } else {
          props.networkActions.selectEdges(edges);
        }
      }, 1);
    };

    const selectNode = () => {
      setTimeout(() => {
        const nodes = [];
        const selectedNodes = cyInstance.$('node:selected');
        selectedNodes.forEach((element) => {
          if (element.data().name !== '') {
            nodes.push(element.data());
          }
        });
        if (nodes.length === 0) {
          props.networkActions.unselectNodes();
        } else {
          props.networkActions.selectNodes(nodes);
        }
      }, 1);
    };

    cyInstance.on('tap', 'node', function () {
      try {
        cyInstance.nodes().removeClass('connected');
      } catch (e) {
        console.warn(e);
      }
      selectNode();
    });

    cyInstance.on('tap', 'edge', function () {
      try {
        cyInstance.nodes().removeClass('connected');
        const selected = this.data();
        const { source, target } = selected;
        cyInstance.$('#' + source + ', #' + target).addClass('connected');
      } catch (e) {
        console.warn(e);
      }
      selectEdge();
    });

    cyInstance.on('boxend', function (event) {
      selectEdge();
      selectNode();
    });

    // Reset the UI state (highlight)
    cyInstance.elements().addClass('faded');
    const query = cyInstance.filter('node[querynode = "true"]');
    query.addClass('highlight');

    //Layout

    if (cyjs != null) {
      const isLayoutAvailable = cyjs.isLayout;
      if (isLayoutAvailable) {
        propLayouts = ['Preset', 'Cose', 'Concentric'];
        propLayout = 'Preset';
        setLayout(PRESET_LAYOUT);
      } else {
        propLayouts = ['Cose', 'Concentric'];
        if (cyjs.elements.length < 500) {
          propLayout = 'Cose';
          setLayout(COSE_LAYOUT);
        } else {
          propLayout = 'Concentric';
          setLayout(CONCENTRIC_LAYOUT);
        }
      }
    }

    new Promise(function (resolve, reject) {
      renderAnnotations();
      resolve();
    }).then(() => {
      props.uiStateActions.update({
        highlights: true,
        layouts: propLayouts,
        layout: propLayout,
      });
    });

    return () => {
      console.log('Network viewer unmounted');
    };
  }, []);

  useEffect(() => {
    if (cyInstance === undefined || cyInstance === null) {
      return;
    }

    const targets = props.search.selectedGenes;
    if (targets === null || targets === undefined) {
      return;
    }

    const selected = cyInstance.elements('node[name = "' + targets[0] + '"]');

    if (selected.length !== 0) {
      try {
        cyInstance.animate(
          {
            zoom: 2,
            center: {
              eles: selected[0],
            },
          },
          {
            duration: 500,
          }
        );
      }
      catch (err) {
        console.log('Caught cyInstance animate error ', err)
      }
    }

    if (targets.length === 0) {
      try {
        cyInstance.animate(
          {
            fit: {
              eles: cyInstance.elements(),
              padding: 6,
            },
          },
          {
            duration: 500,
          }
        );
      }
      catch (err) {
        console.log('Caught cyInstance animate error', err)
      }
    }
  }, [props.search.selectedGenes]);

  useEffect(() => {
    if (cyInstance === undefined || cyInstance === null) {
      return;
    }
    if (fit) {
      cyInstance.animate(
        {
          fit: {
            eles: cyInstance.elements(),
            padding: 6,
          },
        },
        {
          duration: 500,
        }
      );
      props.uiStateActions.fitNetworkView(false);
    }
  }, [fit]);

  useEffect(() => {
    switch (props.uiState.layout) {
      case 'Preset':
        setLayout(PRESET_LAYOUT);
        break;
      case 'Cose':
        setLayout(COSE_LAYOUT);
        break;
      case 'Concentric':
        setLayout(CONCENTRIC_LAYOUT);
        break;
    }
  }, [props.uiState.layout]);

  if (originalElements && originalElements.length > MAX_NETWORK_SIZE) {
    return <Warning {...props} />;
  }

  // Render actual network
  if (cyjs === null || cyjs === undefined) {
    return null;
  }

  // Network background should be set via CSS.
  const networkAreaStyle = {
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0)',
  };

  if (cyInstance !== null) {
    cyInstance.resize();

    if (layout === COSE_LAYOUT || layout === CONCENTRIC_LAYOUT) {
      layout.stop = () => {
        setTimeout(() => {
          try {
          cyInstance.animate(
            {
              fit: {
                eles: cyInstance.elements(),
                padding: 6,
              },
            },
            {
              duration: 0,
            }
          );
          } catch (err) {
            console.log('Caught cyInstance animate error ', err);
          }
        }, 0);
      };
    }

    if (highlights) {
      cyInstance.elements().addClass('faded');
      const query = cyInstance.filter('node[querynode = "true"]');
      query.addClass('highlight');
    } else {
      cyInstance
        .elements()
        .removeClass('faded')
        .removeClass('highlight');
    }
  }

  return (
    <CytoscapeComponent
      elements={cyjs.elements}
      layout={layout}
      style={networkAreaStyle}
      stylesheet={cyjs.style}
      cy={(cy) => {
        cyInstance = cy;
      }}
    />
  );
};

export default CytoscapeViewer;
