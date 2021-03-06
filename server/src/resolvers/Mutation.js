const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const aws = require('aws-sdk')

const { APP_SECRET, getUserId } = require('../utils')

const s3Bucket = process.env.S3_BUCKET
const AWSAccessKeyId = process.env.S3_ACCESS_KEY_ID
const AWSSecretAccessKey = process.env.S3_SECRET_ACCESS_KEY

function signS3(parent, { filename, filetype }, context, info) {
  const userId = getUserId(context)
  
  const s3 = new aws.S3({
        signatureVersion: 'v4',
        region: 'us-east-2',
        accessKeyId: AWSAccessKeyId,
        secretAccessKey: AWSSecretAccessKey,
      })

  // s3.createBucket({Bucket: s3Bucket}, function(err, data) {
  //   if (err) {
  //     console.log(err)
  //   } else {
  //     params = {Bucket: s3Bucket, Key: filename, Body: 'Hello!'};

  //     s3.putObject(params, function(err, data) {
  //       if (err) {
  //         console.log(err)
  //       } else {
  //         console.log("Successfully uploaded data to panbada/filename")
  //       }
  //     })      
  //   }
  // })

  const s3Params = {
    Bucket: s3Bucket,
    Key: filename,
    Expires: 60,
    ContentType: filetype,
    ACL: 'public-read',
  }

  const signedRequest = s3.getSignedUrl('putObject', s3Params)

  const url = `https://${s3Bucket}.s3.amazonaws.com/${filename}`;
  
  console.log("signedRequest " + signedRequest )
  console.log("url " + url)

  return {
    signedRequest,
    url,
  }
}

function createPost(parent, { title, text, pictureURL }, context, info) {
  const userId = getUserId(context)
  return context.db.mutation.createPost(
    {
      data: {
        title,
        text,
        pictureURL,
        postedBy: { connect: { id: userId } },
      },
    },
    info,
  )
}

async function deletePost(parent, { id }, context, info) {
  await context.db.mutation.deleteManyPostComments({ where: { post : {id: id} }})
  return context.db.mutation.deletePost({ where: { id: id} }, info)
}

async function likePost(parent, args, context, info ) {
  const userId = getUserId(context)
  const { id } = args

  const postLikeExists = await context.db.exists.PostLike({
    user: { id: userId },
    post: { id: id },
  })
  
  if (postLikeExists) {
    throw new Error(`Already liked the post: ${id}`)
  } 

  return context.db.mutation.createPostLike({ 
    data: {
      post: { connect: { id: id }},
      user: { connect: { id: userId }}, 
    }
  }, info)
}

async function unlikePost(parent, args, context, info ) {
  const userId = getUserId(context)
  const { id } = args

  return context.db.mutation.deletePostLike({
    where: { id: id }
  }, info)
  
}

async function bookmarkPost(parent, args, context, info ) {
  const userId = getUserId(context)
  const { id } = args

  const postBookmarkExists = await context.db.exists.PostBookmark({
    user: { id: userId },
    post: { id: id },
  })
  
  if (postBookmarkExists) {
    throw new Error(`Already liked the post: ${id}`)
  } 

  return context.db.mutation.createPostBookmark({ 
    data: {
      post: { connect: { id: id }},
      user: { connect: { id: userId }}, 
    }
  }, info)
}

async function unbookmarkPost(parent, args, context, info ) {
  const userId = getUserId(context)
  const { id } = args

  return context.db.mutation.deletePostBookmark({
    where: { id: id }
  }, info)
  
}

function createPostComment(parent, args, context, info) {
  const userId = getUserId(context)
  const { id, text } = args

  return context.db.mutation.createPostComment(
    {
      data: {
        text,
        user: { connect: { id: userId } },
        post: { connect: { id: id } },
      },
    },
    info,
  )
}

function deletePostComment(parent, { id }, context, info) {
  const userId = getUserId(context)

  return context.db.mutation.deletePostComment({ where: { id: id } }, info,)
}

function createGig(parent, args, context, info) {
  const {addressName, lat, lng, address, directions, ...other } = args
  const userId = getUserId(context)

  return context.db.mutation.createGig(
    { data: { 
      ...other, 
      postedBy: { connect: { id: userId } },
      location: { 
        create: { name: addressName, lat, lng, address, directions }
        }
      } 
    },
    info,
  )
}

async function updateGig(parent, args, context, info) {
  const {id, locationId, addressName, lat, lng, address, directions, ...other } = args
  const userId = getUserId(context)
  let location = {}
  if (address) {
    location = locationId
      ? { connect: {id: locationId} } 
      : { create: {name: addressName, lat, lng, address, directions}}
  }

  return context.db.mutation.updateGig(
    { data: { 
      ...other, 
      location
      },
      where: {
       id
      }
    },
    info,
  )
}

function deleteGig(parent, { id }, context, info) {
  const userId = getUserId(context)

  return context.db.mutation.deleteGig({ where: { id: id } }, info,)
}

function createLocation(parent, args, context, info) {
  const userId = getUserId(context)
  const { gigId, ...other} = args

  return context.db.mutation.createLocation({
    data: {...other, gig: {connect: {id: gigId} } }
  }, info)
}

function deleteLocation(parent, { id }, context, info) {
  const userId = getUserId(context)

  return context.db.mutation.deleteLocation({ where: { id: id } }, info,)
}

async function signup(parent, args, context, info) {
  const { firstName, lastName, email } = args
  const level = 'MEMBER'
  
  // validation
  // 1) throw multiple errors
  // 2) validate email address 
  const existingUser = await context.db.query.user({ where: { email: args.email } })
  if (existingUser) {
    throw new Error(`Already existing account with this email: ${args.email}`)
  }

  if (!firstName || firstName.length < 2 ) {
    throw new Error(`Invalid first name. It has to be greater than two or greater characters: ${firstName}`)
  } else if (!lastName || lastName.length < 2 ) {
    throw new Error(`Invalid last name. It has to be greater than two or greater characters: ${lastName}`)
  } else if (!email) {
    throw new Error(`Invalid email address: ${email}`)
  } else if (!args.password || args.password.length < 5 || args.password.length > 20) {
    throw new Error(`Invalid password. Password has to be greater than 5 and less than 20 characters.`)
  }

  const password = await bcrypt.hash(args.password, 10)
  const user = await context.db.mutation.createUser({
    data: { ...args, password, level },
  })

  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return {
    token,
    user,
  }
}

async function login(parent, args, context, info) {
  const user = await context.db.query.user({ where: { email: args.email } })
  if (!user) {
    throw new Error(`Could not find user with email: ${args.email}`)
  }

  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET)

  return {
    token,
    user,
  }
}

function deleteUser(parent, args, context, info ) {
  // if admin 
  // email or ID?
  return context.db.mutation.deleteUser({ where: { email: args.email } })
}

async function changePassword(parent, args, context, info) {
  const { currPassword, newPassword } = args
  let password = null  

  const userId = getUserId(context)
  const user = await context.db.query.user({ where: { id: userId } })

  if (!user) {
    throw new Error(`Could not find user with email: ${args.email}`)
  }
  
  const valid = await bcrypt.compare(currPassword, user.password)
  
  if (!valid) {
    throw new Error('Invalid current password')
  } else {
    password = await bcrypt.hash(newPassword, 10)
  }
  
  
  if (!password) {
    throw new Error('Reset the password again!')
  }

  return context.db.mutation.updateUser(
    { data: { password },
      where: { id: userId }
    },
    info,
  )
}

function updateMe(parent, args, context, info) {
  const { firstName, lastName, avatarURL } = args
  const userId = getUserId(context)

  return context.db.mutation.updateUser(
    { data: { firstName, lastName, avatarURL },
      where: { id: userId }
    },
    info,
  )
}

function createExperience(parent, args, context, info) {
  const { ...other } = args
  const userId = getUserId(context)
  
  return context.db.mutation.createExperience({
    data: { ...other, user: {connect: {id: userId} } }
  }, info)

  // return context.db.mutation.updateUser(
  //   { data: { experiences: {} },
  //     where: { id: userId }
  //   },
  //   info,
  // )
}

function updateExperience(parent, args, context, info) {
  const { id, ...other } = args
  const userId = getUserId(context)
  
  return context.db.mutation.updateExperience({
    data: { ...other, user: {connect: {id: userId} } },
    where: { id }
  }, info)
}

function follow(parent, { id }, context, info) {
  const userId = getUserId(context)

  return context.db.mutation.updateUser({
    data: { 
      follows: {
        connect: [{ id }]
      }
    },
    where: { id: userId },
  }, info)
}

function unfollow(parent, { id }, context, info) {
  const userId = getUserId(context)
  
  return context.db.mutation.updateUser({
    data: { 
      follows: {
        disconnect: [{ id }]
      }
    },
    where: { id: userId },
  }, info)
}

async function createMessage(parent, args, context, info) {
  // channel ID, user ID, toUser ID, text 
  const userId = getUserId(context)
  const { id, text } = args
  let channel

  // const where = { OR: [
  //   { AND: [{ to: { id } }, { from: { id: userId } }] },
  //   { AND: [{ to: {id: userId} }, { from: { id: id } }] },
  // ]}
  
  // const messages = await context.db.query.messages({ where }, info)
  
  // const where = { AND: [
  //   { AND: [{ users_some: { id } }, { from: { id: userId } }] },
  //   { AND: [{ to: {id: userId} }, { from: { id: id } }] },
  // ]}
  
  const where = { users_every: { id_in: [id, userId] }}
  // console.log("messages ", messages)
  const channels = await context.db.query.channels({ where }, info)
  
  console.log("channel ", channels)
  
  if (channels.length === 0) {
    channels = await context.db.mutation.createChannel({
      data: {
        users: { connect: [{ id: id }, { id: userId }] },
      }
    }, info)
  }

  console.log("channel ", channels)

  return context.db.mutation.createMessage({ 
    data: { 
      to: { connect: {id } },
      from: { connect: { id: userId } }, 
      text: text,
      channel: { connect: { id: channels[0].id } },
    } 
  }, info)
}

function deleteMessage(parent, { id }, ctx, info) {
  return ctx.db.mutation.deleteMessage({ where: { id } }, info)
}

async function deleteChannel(parent, { id }, context, info) {
  await context.db.mutation.deleteManyMessages({ where : { channel: { id } }})
  return context.db.mutation.deleteChannel({ where: { id } }, info)
}

module.exports = {
  createPost,
  deletePost,
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  createPostComment,
  deletePostComment,
  createGig,
  updateGig,
  deleteGig,
  createLocation,
  deleteLocation,
  signup,
  login,
  deleteUser,
  changePassword,
  updateMe,
  createExperience,
  updateExperience,
  follow,
  unfollow,
  signS3,
  createMessage,
  deleteMessage,
  deleteChannel,
}