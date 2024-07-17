import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  endpoint: 'http://localhost:4566',
  sslEnabled: false,
});

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

function SQSAdmin() {
  const [queues, setQueues] = useState([]);
  const [queueUrl, setQueueUrl] = useState('');
  const [queueName, setQueueName] = useState('');
  const [message, setMessage] = useState('');
  const [receivedMessage, setReceivedMessage] = useState(null);
  const [parsedMessage, setParsedMessage] = useState('');

  useEffect(() => {
    listQueues();
  }, []);

  const listQueues = async () => {
    try {
      const result = await sqs.listQueues().promise();
      const localQueueUrls = (result.QueueUrls || []).map((url) => {
        const urlParts = url.split('/');
        const queueName = urlParts[urlParts.length - 1];
        return `http://localhost:4566/000000000000/${queueName}`;
      });
      setQueues(localQueueUrls);
    } catch (error) {
      console.error('Error listing queues:', error);
    }
  };

  const createQueue = async () => {
    try {
      await sqs.createQueue({ QueueName: queueName }).promise();
      const formattedQueueUrl = `http://localhost:4566/000000000000/${queueName}`;
      setQueueUrl(formattedQueueUrl);
      listQueues();
      setQueueName('');
    } catch (error) {
      console.error('Error creating queue:', error);
    }
  };

  const deleteQueue = async (url) => {
    try {
      await sqs.deleteQueue({ QueueUrl: url }).promise();
      listQueues();
    } catch (error) {
      console.error('Error deleting queue:', error);
    }
  };

  const sendMessage = async () => {
    try {
      await sqs.sendMessage({
        QueueUrl: queueUrl,
        MessageBody: message,
      }).promise();
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const receiveMessage = async (url) => {
    try {
      const result = await sqs.receiveMessage({
        QueueUrl: url,
        MaxNumberOfMessages: 1,
      }).promise();

      if (!result.Messages || result.Messages.length === 0) {
        console.log('No messages available');
        setReceivedMessage(null);
        setParsedMessage('');
        return;
      }

      const received = result.Messages[0];
      setReceivedMessage(received);

      try {
        const parsed = JSON.parse(received.Body);
        if (parsed.Message !== undefined) {
          setParsedMessage(parsed.Message);
        } else {
          setParsedMessage(received.Body);
        }
      } catch (parseError) {
        // If parsing fails, assume the body is plain text
        setParsedMessage(received.Body);
      }
    } catch (error) {
      console.error('Error receiving message:', error);
      setReceivedMessage(null);
      setParsedMessage('');
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4">SQS Admin UI</h1>
      <div className="mb-3">
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Queue Name"
          value={queueName}
          onChange={(e) => setQueueName(e.target.value)}
        />
        <button className="btn btn-primary" onClick={createQueue}>
          Create Queue
        </button>
      </div>
      <div className="mb-3">
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Queue URL"
          value={queueUrl}
          onChange={(e) => setQueueUrl(e.target.value)}
        />
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="btn btn-success" onClick={sendMessage}>
          Send Message
        </button>
      </div>
      <h2 className="mb-3">Queues</h2>
      <ul className="list-group mb-3">
        {queues.map((url) => (
          <li key={url} className="list-group-item">
            <div className="row align-items-center">
              <div className="col-md-8 d-flex align-items-center">
                {url}
                <span style={{ display: 'inline-block', width: '4px' }}></span>
                <CopyToClipboard text={url}>
                  <button className="btn btn-secondary btn-sm ml-5" style={{ opacity: 0.4 }}>
                    <i className="fas fa-copy"></i>
                  </button>
                </CopyToClipboard>
              </div>
              <div className="col-md-4 d-flex justify-content-end">
                <button className="btn btn-danger btn-sm mr-2" onClick={() => deleteQueue(url)}>
                  Delete
                </button>
                <span style={{ display: 'inline-block', width: '4px' }}></span>
                <button className="btn btn-info btn-sm" onClick={() => receiveMessage(url)}>
                  Receive Message
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {receivedMessage && (
        <div className="alert alert-info">
          <h4>Received Message</h4>
          <p><strong>Message ID:</strong> {receivedMessage.MessageId}</p>
          {parsedMessage && (
            <p><strong>Message:</strong> {parsedMessage}</p>
          )}
          <p><strong>Body:</strong> {receivedMessage.Body}</p>
        </div>
      )}
    </div>
  );
}

export default SQSAdmin;
