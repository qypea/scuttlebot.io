var page = require('../../page.part')
var com = require('../../com.part')

module.exports = () => page({
  title: 'Private Box',
  section: 'more',
  tab: 'more-protocols',
  path: '/more/protocols/private-box.html',
  content: `
    <h2>Private Box</h2>
    <p>
      Private-box is a format for encrypting a private message to many parties.
      You can <strong><a href="https://github.com/auditdrivencrypto/private-box">find the repository on GitHub</a></strong>.
    </p>

    <h2 id="properties">Properties</h2>
    <p>
      This protocol was designed for use with secure-scuttlebutt.
      In this place, messages are placed in public, and the sender is known via a signature,
      but we can hide the recipient and the content.
    </p>

    <h4 id="-recipients-are-hidden-">Recipients are hidden.</h4>
    <p>
      An eaves-dropper cannot know the recipients or their number.
      Since the message is encrypted to each recipient, and then placed in public,
      to receive a message you will have to decrypt every message posted.
      This would not be scalable if you had to decrypt every message on the internet,
      but if you can restrict the number of messages you might have to decrypt,
      then it&#39;s reasonable. For example, if you frequented a forum which contained these messages,
      then it would only be a reasonable number of messages, and posting a message would only
      reveal that you where talking to some other member of that forum.
    </p>
    <p>Hiding access to such a forum is another problem that&#39;s out of the current scope.</p>

    <h4 id="-the-number-of-recipients-are-hidden-">The number of recipients are hidden.</h4>
    <p>
      If the number of recipients was not hidden, then sometimes it would be possible
      to deanonymise the recipients, if there was a large group discussion with
      an unusual number of recipients. Encrypting the number of recipients means that,
      when a message is not encrypted to you, you will attempt to decrypt same number of times
      as the maximum recipients.
    </p>

    <h4 id="-a-valid-recipient-does-not-know-the-other-recipients-">A valid recipient does not know the other recipients.</h4>
    <p>
      A valid recipient knows the number of recipients but not who they are.
      This is more a sideeffect of the design than an intentional design element.
      The plaintext contents may reveal the recipients, if needed.
    </p>

    <h4 id="-by-providing-the-key-for-a-message-an-outside-party-could-decrypt-the-message-">By providing the key for a message, an outside party could decrypt the message.</h4>
    <p>
      When you tell someone a secret you must trust them not to reveal it.
      Anyone who knows the key could reveal that to some other party who could then read the message content,
      but not the recipients (unless the sender revealed the ephemeral secret key).
    </p>

    <h2 id="assumptions">Assumptions</h2>
    <p>
      Messages will be posted in public, so that the sender is likely to be known,
      and everyone can read the messages. (This makes it possible to hide the recipient,
      but probably not the sender.)
    </p>
    <p>Resisting traffic analysis of the timing or size of messages is out of scope of this spec.</p>

    <h2 id="prior-art">Prior Art</h2>
    <h4 id="-pgp-">PGP</h4>
    <p>
      In PGP the recipient, the sender, and the subject are sent as plaintext.
      If the recipient is known, then the metadata graph of who is communicating with who can be read,
      which, since it is easier to analyze than the content, is important to protect.
    </p>
    <h4 id="-sodium-seal-">Sodium seal</h4>
    <p>
      The Sodium library provides a <em>seal</em> function that generates an ephemeral keypair,
      derives a shared key to encrypt a message, and then sends the ephemeral public key and the message.
      The recipient is hidden, and it is forward secure if the sender throws out the ephemeral key.
      However, it&#39;s only possible to have one recipient.
    </p>

    <h4 id="-minilock-">Minilock</h4>
    <p>
      Minilock uses a similar approach to <code>private-box</code> but does not hide the
      number of recipients. In the case of a group discussion where multiple rounds
      of messages are sent to everyone, this may enable an eavesdropper to deanonymize
      the participiants of a discussion if the sender of each message is known.
    </p>

    <h2 id="api">API</h2>

    <h4 id="-encrypt-plaintext-buffer-recipients-array-curve25519_pk-">encrypt (plaintext Buffer, recipients Array<curve25519_pk>)</h4>
    <p>
      Takes a plaintext buffer of the message you want to encrypt,
      and an array of recipient public keys.
      Returns a message that is encrypted to all recipients
      and openable by them with <code>PrivateBox.decrypt</code>.
      The recipients must be between 1 and 7 items long.
    </p>
    <p>
      The encrypted length will be <code>56 + (recipients.length * 33) + plaintext.length</code> bytes long,
      between 89 and 287 bytes longer than the plaintext.
    </p>

    <h4 id="-decrypt-cyphertext-buffer-secretkey-curve25519_sk-">decrypt (cyphertext Buffer, secretKey curve25519_sk)</h4>
    <p>
      Attempt to decrypt a private-box message, using your secret key.
      If you where an intended recipient then the plaintext will be returned.
      If it was not for you, then <code>undefined</code> will be returned.
    </p>

    <h2 id="protocol">Protocol</h2>
    <h4 id="-encryption-">Encryption</h4>
    <p>Private-box generates:</p>
    <ul>
      <li><code>ephemeral</code>: an ephemeral curve25519 keypair that will only be used with this message.</li>
      <li><code>body_key</code>: a random key that will be used to encrypt the plaintext body.</li>
    </ul>
    <p>
      First, private-box outputs the ephemeral public key, then multiplies each recipient public key
      with its secret to produce ephemeral shared keys (<code>shared_keys[1..n]</code>).
      Then, private-box concatenates <code>body_key</code> with the number of recipients,
      encrypts that to each shared key, and concatenates the encrypted body.
    </p>
    ${ com.code({ js: `
function encrypt (plaintext, recipients) {
  var ephemeral = keypair()
  var nonce     = random(24)
  var body_key  = random(32)
  var body_key_with_length = concat([
    body_key,
    recipients.length
  ])
  return concat([
    nonce,
    ephemeral.publicKey,
    concat(recipients.map(function (publicKey) {
      return secretbox(
        body_key_with_length,
        nonce,
        scalarmult(publicKey, ephemeral.secretKey)
      )
    }),
    secretbox(plaintext, nonce, body_key)
  ])
}` }) }
    
    <h4 id="-decryption-">Decryption</h4>
    <p>
      <code>private-box</code> takes the nonce and ephemeral public key,
      multiplies that with your secret key, then tests each possible
      recipient slot until it either decrypts a key or runs out of slots.
      If it runs out of slots, the message was not addressed to you,
      so <code>undefined</code> is returned. Else, the message is found and the body
      is decrypted.
    </p>
    ${ com.code({ js: `
function decrypt (cyphertext, secretKey) {
  var next = reader(cyphertext) // next() will read
                                // the passed N bytes
  var nonce = next(24)
  var publicKey = next(32)
  var sharedKey = salarmult(publicKey, secretKey)

  for(var i = 0; i &lt; 7; i++) {
    var maybe_key = next(33)
    var key_with_length = secretbox_open(
      maybe_key,
      nonce,
      sharedKey
    )
    if (key_with_length) { // decrypted!
      var key = key_with_length.slice(0, 32)
      var length = key_with_length[32]
      return secretbox_open(
        key,
        cyphertext.slice(
          56 + 33*(length+1),
          cyphertext.length
        ),
      )
    }
  }
  // this message was not addressed
  // to the owner of secretKey
  return undefined
}` }) }
  `
})
