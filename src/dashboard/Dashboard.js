import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  endpoint: 'http://localhost:4566',
  sslEnabled: false,
});

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

function Dashboard() {
  const [queueData, setQueueData] = useState([]);
  const [topicData, setTopicData] = useState([]);

  useEffect(() => {
    fetchQueueData();
    fetchTopicData();
  }, []);

  const fetchQueueData = async () => {
    try {
      const result = await sqs.listQueues().promise();
      const queueUrls = result.QueueUrls || [];
      const data = await Promise.all(queueUrls.map(async (url) => {
        const urlParts = url.split('/');
        const queueName = urlParts[urlParts.length - 1];
        const queueUrl = `http://localhost:4566/000000000000/${queueName}`;
        
        const attributes = await sqs.getQueueAttributes({
          QueueUrl: queueUrl,
          AttributeNames: ['ApproximateNumberOfMessages'],
        }).promise();

        return {
          name: queueName,
          messages: parseInt(attributes.Attributes.ApproximateNumberOfMessages, 10),
        };
      }));
      console.log("Queue Data:", data);
      setQueueData(data);
    } catch (error) {
      console.error('Error fetching queue data:', error);
    }
  };

  const fetchTopicData = async () => {
    try {
      const result = await sns.listTopics().promise();
      const topicArns = result.Topics.map(topic => topic.TopicArn);
      const data = await Promise.all(topicArns.map(async (topicArn) => {
        const subscriptions = await sns.listSubscriptionsByTopic({ TopicArn: topicArn }).promise();
        return {
          name: topicArn.split(':').pop(),
          subscribers: subscriptions.Subscriptions.length,
        };
      }));
      console.log("Topic Data:", data);
      setTopicData(data);
    } catch (error) {
      console.error('Error fetching topic data:', error);
    }
  };

  return (
    <div className="container">
      <h1 className="mb-4">AWS Dashboard</h1>
      <div className="row">
        <div className="col-md-6">
          <h2>Messages per Queue</h2>
          <BarChart width={600} height={300} data={queueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="messages" fill="#8884d8" />
          </BarChart>
        </div>
        <div className="col-md-6">
          <h2>Subscribers per Topic</h2>
          <BarChart width={600} height={300} data={topicData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="subscribers" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
