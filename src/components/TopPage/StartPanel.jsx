import React, { useEffect } from 'react'
import SearchTextBox from './SearchTextBox'
import Footer from './Footer'
import LoadingPanel from '../LoadingPanel'
import Typography from '@material-ui/core/Typography'
import ndex from '../../assets/images/ndex-logo.svg'
import queryString from 'query-string'
import './style.css'

const feedbackURL = 'https://home.ndexbio.org/contact-us/'

// TODO: move this to a global property
const APP_VERSION = 'v1.1'

const StartPanel = props => {
  useEffect(() => {
    const params = queryString.parse(props.location.search)
    const genes = params.genes

    if (genes !== undefined) {
      const geneList = genes.split(/\s|,/)
      props.searchActions.setQuery(genes)
      props.searchActions.searchStarted({ geneList })
    }
    props.sourceActions.findSourceStarted()

    return () => {}
  }, [])

  if (props.search.isSearching) {
    return (
      <LoadingPanel
        title={'Searching Remote Database'}
        message={<div style={{ color: 'black' }}>Please wait...</div>}
      />
    )
  }

  return (
    <div className="start-container">
      <div className={'start-title'}>
        <div className={'description-panel'}>
          <Typography align={'center'} variant={'subtitle2'}>
            One search finds pathways, queries protein interaction networks, and
            discovers disease, drug, and tissue associations. Powered by NDEx
            and integrated with Cytoscape
          </Typography>
        </div>

        <div className={'title-panel'}>
          <img
            className="start-logo-main"
            src={ndex}
            alt="logo"
            style={{ height: '8.75em', paddingRight: '1em' }}
          />
          <div className="flex">
            <div className={'app-title'}>NDEx Integrated Query</div>
            <Typography
              align="left"
              style={{ position: 'relative', left: '0.25em', top: '-0.5em' }}
            >
              {APP_VERSION}
            </Typography>
          </div>
        </div>

        <SearchTextBox {...props} />

        <div className={'search-text-note'}>
          <Typography variant="caption" align="left">
            NDEx Integrated Query uses selected pathway and interactome networks
            in NDEx to power gene set analysis. The networks come from many
            different sources and new networks will be continuously added. Do
            you have a pathway or an interaction network that you would like to
            include in these queries? Click{' '}
            <a href={feedbackURL} target="_blank" rel="noopener noreferrer">
              here
            </a>{' '}
            to find out how.
          </Typography>
        </div>
        <div style={{ height: '4em' }} />
      </div>
      <Footer />
    </div>
  )
}

export default StartPanel
