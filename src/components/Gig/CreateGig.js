import React, { Component } from 'react'
import { graphql, compose } from 'react-apollo'
import {withRouter} from 'react-router-dom'
import gql from 'graphql-tag'
import axios from 'axios'
import moment from 'moment'

import { withStyles } from 'material-ui/styles'
import TextField from 'material-ui/TextField'
import Button from 'material-ui/Button'
import Select from 'material-ui/Select'
import Switch from 'material-ui/Switch'
import Input, { InputLabel } from 'material-ui/Input'
import { MenuItem } from 'material-ui/Menu'
import { FormControl, FormControlLabel } from 'material-ui/Form'
import Paper from 'material-ui/Paper'
import Typography from 'material-ui/Typography'

import { GigFragments, UserFragments } from '../../constants/gqlFragments'

import FeedbackMessage from '../Util/FeedbackMessage'
import GeoAutocompleteContainer from '../Geo/GeoAutocompleteContainer'

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  root: {
    padding: 20,
    marginTop: 20,
  },
  button: {
    margin: theme.spacing.unit * 2,
  },
})

class CreateGig extends Component {
  state = {
    id: '',
    type: '',
    title: '',
    text: '',  
    startDateTime: null,
    endDateTime: null,
    location: {
        lat: 0,
        lng: 0,
      },
    addressName: '',
    address: '',
    directions: '',
    addDateTime: false,
    errors: [],
  }

  componentWillUpdate() {
    if (this.state.errors.length > 0 ) this.setState({errors: []})
  }

  render() {
    const { classes } = this.props
    const { addDateTime } = this.state

    const gigTypes = [
      {name: 'Creative', value: 'CREATIVE'}, 
      {name: 'Crew', value: 'CREW'}, 
      {name: 'Event', value: 'EVENT'}, 
      {name: 'Labor', value: 'LABOR'}, 
      {name: 'Talent', value: 'TALENT'}, 
      {name: 'Technical', value: 'TECHNICAL'}, 
      {name: 'Writing', value: 'WRITING'}, 
      {name: 'Other', value: 'OTHER'}, 
    ]
    const start = moment().format('YYYY-MM-DD[T]hh:mm').toString()
    const end = moment().add(2, 'hours').format('YYYY-MM-DD[T]hh:mm').toString()
    
    const $dateTimeForm = (<FormControl fullWidth className={classes.margin} disabled>
            <TextField
              id='datetime-start'
              label='Start Date & Time'
              type='datetime-local'
              defaultValue={start}
              className={classes.textField}
              onChange={e => this.setState({ startDateTime: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              id='datetime-end'
              label='End Date & Time'
              type='datetime-local'
              defaultValue={end}
              className={classes.textField}
              onChange={e => this.setState({ endDateTime: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </FormControl>)
    
    const { errors } = this.state
    let $errorMessage = null
    if (errors.length > 0) {
      $errorMessage = (<FeedbackMessage type='error' message={errors[0].message} />)
    }

    return (
      <Paper className={classes.root} elevation={4}>
        <Typography variant='title' gutterBottom>
         Post a Gig
        </Typography>
        <Typography component='p'>
          Create an awesome gig to collaborate with others.
        </Typography>
        <form className={this.props.container} noValidate autoComplete="off">
          <FormControl fullWidth className={classes.margin}>
            <InputLabel htmlFor="gig-type">Type</InputLabel>
            <Select
              value={this.state.type}
              onChange={e => this.setState({ type: e.target.value })}
              inputProps={{
                name: 'type',
                id: 'gig-type',
              }}
            >
            {gigTypes.map((type, index) => 
              <MenuItem value={type.value} key={index}>{type.name}</MenuItem>
            )}
            </Select>
          </FormControl>
          <FormControl fullWidth className={classes.margin}>
            <TextField
              id='title'
              label='Title'
              className={this.props.textField}
              value={this.state.title}
              onChange={e => this.setState({ title: e.target.value })}
              margin='normal'
            />
          </FormControl>
          <FormControl fullWidth className={classes.margin}>
            <FormControlLabel
              control={
                <Switch
                  checked={this.state.addDateTime}
                  onChange={this._handleDateTimeOn('addDateTime')}
                  value='addDateTime'
                  color='primary'
                />
              }
              label='Add Date & Time'
            />
          </FormControl>
          {addDateTime && $dateTimeForm}
          <FormControl fullWidth className={classes.margin}>
            <TextField
              id="text"
              label="Description"
              multiline={true}
              rows={5}
              rowsMax={8}
              className={this.props.textField}
              value={this.state.text}
              onChange={e => this.setState({ text: e.target.value })}
              margin="normal"
            />
          </FormControl>
          <FormControl fullWidth className={classes.margin}>
            <GeoAutocompleteContainer onSearchGeo={this._handleGeo}/>
          </FormControl>
          <FormControl fullWidth className={classes.margin}>
            <TextField
              id='text'
              label='Directions'
              multiline={true}
              rows={5}
              rowsMax={8}
              className={this.props.textField}
              value={this.state.directions}
              onChange={e => this.setState({ directions: e.target.value })}
              margin='normal'
            />
          </FormControl>
          <Button variant="raised" color="primary" className={this.props.button} onClick={() => this._createGig()}>
              Submit
          </Button>
        </form>
        {$errorMessage}
      </Paper>
    )
  }
  
  _handleDateTimeOn = name => event => {
    this.setState({ [name]: event.target.checked })
  }

  _formatFilename = filename => {
    const date = moment().format('YYYYMMDD')
    const randomString = Math.random()
      .toString(36)
      .substring(2, 7)
    const cleanFileName = filename.toLowerCase().replace(/[^a-z0-9]/g, "-");
    console.log(cleanFileName)
    const newFilename = `images/${date}-${randomString}-${cleanFileName}`;
    return newFilename.substring(0, 60);
  };

  _uploadToS3 = async (file, signedRequest) => {
    const options = {
      headers: {
        "Content-Type": file.type
      }
    }
    await axios.put(signedRequest, file, options)
  }

  _createGig = async () => {
    const { 
      title, 
      text, 
      type, 
      location,
      startDateTime,
      endDateTime,
      addressName,
      address,
      directions, } = this.state

    const lat = location.lat,
          lng = location.lng 

    await this.props.createGigMutation({
      variables: {
        type,
        title,
        text,
        startDateTime,
        endDateTime,
        addressName,
        lat,
        lng,
        address,
        directions,
      },
      update: (store, { data: { createGig }}) => {
        this.props.history.push(`/g/${createGig.id}`)
      }
    })
    .then(res => {
        if (!res.errors) {
        } else {
            // handle errors with status code 200
            console.log('200 errors ', res.errors)
            if (res.errors.length > 0) this.setState({errors: res.errors})
        }
      })
      .catch(e => {
        // GraphQL errors can be extracted here
        if (e.graphQLErrors) {
            console.log('catch errors ', e.graphQLErrors)
            this.setState({errors: e.graphQLErrors})
        }
       }) 
  }
  
  _handleGeo = (places) => {
    if (places.length === 0 || !places) return
    const place = places[0]

    this.setState({
      addressName: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    })
  }

  _onDrop = async files => {
    this.setState({ file: files[0] })
  }

  _handleImageFile = (e) => {
    const reader = new FileReader()
    const file = e.target.files[0]
      
    reader.onload = (upload) => {
      this.setState({
        image_uri: upload.target.result,
        // filename: file.name,
        // filetype: file.type
      })
    }

    reader.readAsDataURL(file)
  }
}


const CREATE_GIG_MUTATION = gql`
  mutation CreateGigMutation(
      $type: GIG_TYPE!, 
      $title: String!, 
      $text: String!,
      $startDateTime: DateTime, 
      $endDateTime: DateTime, 
      $addressName: String, 
      $lat: Float, 
      $lng: Float, 
      $address: String, 
      $directions: String
    ) {
    createGig(
      type:$type, 
      title: $title, 
      text: $text
      startDateTime: $startDateTime, 
      endDateTime: $endDateTime, 
      addressName: $addressName, 
      lat: $lat, 
      lng: $lng, 
      address: $address, 
      directions: $directions,
      ) {
      ...GigBasic
      postedBy {
        ...Avatar
      }
      location {
        ...Location
      }
    }
  }
  ${GigFragments.gigBasic}
  ${GigFragments.location}
  ${UserFragments.avatar}
`

const S3_SIGN_MUTATION = gql`
  mutation S3SignMutation($filename: String!, $filetype: String!) {
    signS3(filename: $filename, filetype: $filetype) {
      url
      signedRequest
    }
  }
`

export default withStyles(styles)(compose(
  graphql(CREATE_GIG_MUTATION, {name: 'createGigMutation'}),
  graphql(S3_SIGN_MUTATION, {name: 's3SignMutation'})
)(withRouter(CreateGig)))