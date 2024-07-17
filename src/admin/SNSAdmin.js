import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import 'bootstrap/dist/css/bootstrap.min.css';

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  endpoint: 'http://localhost:4566',
  sslEnabled: false,
});

const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

function SNSAdmin() {
  const [topics, setTopics] = useState([]);
  const [queueArn, setQueueArn] = useState('');
  const [topicName, setTopicName] = useState('');
  const [queueName, setQueueName] = useState('');
  const [topicArn, setTopicArn] = useState('');
  const [topicMessages, setTopicMessages] = useState({});
  const [subscriptions, setSubscriptions] = useState({});

  useEffect(() => {
    listTopics();
  }, []);

  const listTopics = async () => {
    try {
      const result = await sns.listTopics().promise();
      const topicArns = (result.Topics || []).map(topic => topic.TopicArn);
      const topicDetails = await Promise.all(topicArns.map(async arn => {
        const attributes = await sns.getTopicAttributes({ TopicArn: arn }).promise();
        return { name: attributes.Attributes.DisplayName || arn.split(':').pop(), arn };
      }));
      setTopics(topicDetails);
      await listSubscriptions(topicArns);
    } catch (error) {
      console.error('Error listing topics:', error);
    }
  };

  const listSubscriptions = async (topicArns) => {
    try {
      const subs = {};
      await Promise.all(topicArns.map(async (arn) => {
        const result = await sns.listSubscriptionsByTopic({ TopicArn: arn }).promise();
        subs[arn] = result.Subscriptions.map(sub => ({ endpoint: sub.Endpoint, subscriptionArn: sub.SubscriptionArn }));
      }));
      setSubscriptions(subs);
    } catch (error) {
      console.error('Error listing subscriptions:', error);
    }
  };

  const createTopic = async () => {
    try {
      const result = await sns.createTopic({ Name: topicName }).promise();
      setTopics([...topics, { name: topicName, arn: result.TopicArn }]);
      setTopicName('');
    } catch (error) {
      console.error('Error creating topic:', error);
    }
  };

  const subscribeQueueToTopic = async () => {
    let createdQueueUrl;
    try {
      // Check if queue exists
      const result = await sqs.getQueueUrl({ QueueName: queueName }).promise();
      createdQueueUrl = result.QueueUrl;
    } catch (error) {
      if (error.code === 'QueueDoesNotExist') {
        // Queue does not exist, create it
        const queueResult = await sqs.createQueue({ QueueName: queueName }).promise();
        createdQueueUrl = queueResult.QueueUrl;
      } else {
        console.error('Error getting queue URL:', error);
        return;
      }
    }

    // Replace the URL host with localhost
    createdQueueUrl = createdQueueUrl.replace(/^(http:\/\/)[^\/]+/, '$1localhost:4566');

    try {
      const queueAttributes = await sqs.getQueueAttributes({
        QueueUrl: createdQueueUrl,
        AttributeNames: ['QueueArn'],
      }).promise();

      const createdQueueArn = queueAttributes.Attributes.QueueArn;
      setQueueArn(createdQueueArn);

      const subscriptionResult = await sns.subscribe({
        TopicArn: topicArn,
        Protocol: 'sqs',
        Endpoint: createdQueueArn,
      }).promise();

      setQueueName('');
      setTopicArn('');
      const currentSubscriptions = subscriptions[topicArn] || [];
      setSubscriptions(prev => ({
        ...prev,
        [topicArn]: [
          ...currentSubscriptions,
          { endpoint: createdQueueArn, subscriptionArn: subscriptionResult.SubscriptionArn }
        ]
      }));
    } catch (error) {
      console.error('Error subscribing queue to topic:', error);
    }
  };

  const unsubscribeQueueFromTopic = async (subscriptionArn, topicArn) => {
    try {
      await sns.unsubscribe({ SubscriptionArn: subscriptionArn }).promise();
      setSubscriptions(prev => ({
        ...prev,
        [topicArn]: prev[topicArn].filter(sub => sub.subscriptionArn !== subscriptionArn)
      }));
    } catch (error) {
      console.error('Error unsubscribing queue from topic:', error);
    }
  };

  const sendMessage = async (topicArn) => {
    try {
      await sns.publish({
        TopicArn: topicArn,
        Message: topicMessages[topicArn] || '',
      }).promise();
      setTopicMessages({ ...topicMessages, [topicArn]: '' });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMessageChange = (e, topicArn) => {
    setTopicMessages({ ...topicMessages, [topicArn]: e.target.value });
  };

  return (
    <div className="container">
      <h1 className="mb-4">SNS Admin UI</h1>
      <div className="row">
        <div className="col-md-6">
          <h2>Create SNS Topic</h2>
          <div className="mb-3">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Topic Name"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={createTopic}>
              Create Topic
            </button>
          </div>
        </div>
        <div className="col-md-6">
          <h2>Subscribe SQS Queue to SNS</h2>
          <div className="mb-3">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Queue Name"
              value={queueName}
              onChange={(e) => setQueueName(e.target.value)}
            />
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Topic ARN"
              value={topicArn}
              onChange={(e) => setTopicArn(e.target.value)}
            />
            <button className="btn btn-primary" onClick={subscribeQueueToTopic}>
              Subscribe Queue to Topic
            </button>
          </div>
          {queueArn && (
            <div className="alert alert-info">
              <p><strong>Queue ARN:</strong> {queueArn}</p>
            </div>
          )}
        </div>
      </div>
      {topics.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-12">
            <h2>Send Message to SNS Topic</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Topic Name</th>
                  <th>Topic ARN</th>
                  <th>Message</th>
                  <th>Action</th>
                  <th>Subscribed Queues</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.arn}>
                    <td>{topic.name}</td>
                    <td>{topic.arn}
                      <span style={{ display: 'inline-block', width: '4px' }}></span>
                      <CopyToClipboard text={topic.arn}>
                        <button className="btn btn-secondary btn-sm ml-5" style={{ opacity: 0.4 }}>
                          <i className="fas fa-copy"></i>
                        </button>
                      </CopyToClipboard>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={topicMessages[topic.arn] || ''}
                        onChange={(e) => handleMessageChange(e, topic.arn)}
                      />
                    </td>
                    <td>
                      <button className="btn btn-success" onClick={() => sendMessage(topic.arn)}>
                        Send Message
                      </button>
                    </td>
                    <td>
                      <ul>
                        {subscriptions[topic.arn] ? subscriptions[topic.arn].map((sub, index) => (
                          <li key={index} className="d-flex justify-content-between align-items-center">
                            {sub.endpoint}
                            <button className="btn btn-danger btn-sm ml-2" onClick={() => unsubscribeQueueFromTopic(sub.subscriptionArn, topic.arn)}>
                              Unsubscribe
                            </button>
                          </li>
                        )) : <li>No subscriptions</li>}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SNSAdmin;
