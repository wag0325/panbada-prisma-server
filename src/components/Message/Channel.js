// user component for user list
import React, { Component } from 'react'
import { graphql, compose } from 'react-apollo'
import gql from 'graphql-tag'
import { Link } from 'react-router-dom'

import { withStyles } from 'material-ui/styles'
import Card, { CardActions, CardContent } from 'material-ui/Card'
import Button from 'material-ui/Button'
import Typography from 'material-ui/Typography'
import List, {
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
} from 'material-ui/List';
import Avatar from 'material-ui/Avatar'
import IconButton from 'material-ui/IconButton'

import { timeDifferenceForDate } from '../../utils'
import { AUTH_TOKEN, ME_ID, AVATAR_DEFAULT } from '../../constants'

const styles = theme => ({
  card: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    marginBottom: 16,
    fontSize: 14,
    color: theme.palette.text.secondary,
  },
  pos: {
    marginBottom: 12,
    color: theme.palette.text.secondary,
  },
})

class Channel extends Component {
  constructor(props) {
    super(props)

    // console.log("me", props.meQuery.me)
    this.state = {
    }
  }

  componentWillReceiveProps(nextProps){
    // const { user } = nextProps
    // const { me } = nextProps.meQuery 
  
    // if (me && user) {      
    //   me.follows.map(follow => {
    //     if (follow.id === user.id) {
    //       this.setState({following: true})
    //       return false
    //     }
    //   })
    // }
  }


  // componentWillMount() {
  //   this.setState({userId: this.props.user.id})
  // }

  render() {
    const authToken = localStorage.getItem(AUTH_TOKEN)
    const meId = localStorage.getItem(ME_ID)
    
    console.log("props ", this.props)
    // Only one recipient
    const users = this.props.channel.users.filter(user => 
        user.id !== meId )
    const user = users[0]

    const lastMessage = this.props.channel.messages[this.props.channel.messages.length-1]
    

    return (
      <ListItem>
        <ListItemAvatar>
          <Avatar aria-label={`${user.firstName}-${user.lastName}`}
              className={this.props.avatar} 
              src={user.avatarURL || AVATAR_DEFAULT}
          />        
        </ListItemAvatar>
        <ListItemText
          primary={`${user.firstName} ${user.lastName}`}
          secondary={`${lastMessage.from.firstName}: ${lastMessage.text}`}
        />
        <ListItemSecondaryAction>
          {timeDifferenceForDate(lastMessage.createdAt)}
        </ListItemSecondaryAction>
      </ListItem>
    )
  }

  _likePost = async () => {
    const postId = this.props.post.id
    await this.props.postLikeMutation({
      variables: {
        postId
      },
      update: (store, {data: {postLike}}) => {
        this.props.updateStoreAfterPostLike(store, postLike, postId)
      },
    })
  }

  _followUser = async () => {
    const id = this.props.user.id
    await this.props.followMutation({
      variables: {
        id
      },
      update: (store, {data: {follow}}) => {
        this.setState({ following: true })
      },
    })
  }

  _unfollowUser = async () => {
    const id = this.props.user.id
    await this.props.unfollowMutation({
      variables: {
        id
      },
      update: (store, {data: {unfollow}}) => {
        this.setState({ following: false })
      },
    })
  }
}

export const FOLLOW_MUTATION = gql`
  mutation FollowMutation($id: ID!) {
    follow(id: $id) {
      id
    }
  }
`

export const UNFOLLOW_MUTATION = gql`
  mutation UnfollowMutation($id: ID!) {
    unfollow(id: $id) {
      id
    }
  }
`

export const ME_QUERY = gql`
  query MeQuery {
    me {
      id
      follows {
        id
      }
    }
  }
`


export default withStyles(styles)(Channel)