## Workflow Overview

This project incorporates a sophisticated workflow to detect and prevent Zero-day attacks in real-time. Let me break down the process step by step:

[![Flowchart-Flowchart-4.png](https://i.postimg.cc/j2q2RxDZ/Flowchart-Flowchart-4.png)](https://postimg.cc/vgjbzdLV)

### 1. Cicflowmeter - Collecting Network Logs

The whole process begins with Cicflowmeter, a network flow collection tool. It actively monitors network traffic and gathers extensive flow-based data. These flows are fed as input to the threat detection system.

### 2. Layer 1 - Machine Learning Classification

The collected network flows are sent to Layer 1. This layer is powered by XGBoost classifier. Here's what happens:

- **Classification:** XGBoost analyzes the flow data, categorizing each flow as either benign or potentially malicious based on known patterns.

### 3. Layer 2 - Anomaly Detection

Flows classified as potentially malicious in Layer 1 are then forwarded to Layer 2, which comprises a range of unsupervised models which are LOF and Isolation Forest. In Layer 2:

- **Anomaly Detection:** These models scrutinize each flow more deeply, identifying specific attack types and patterns. If a flow deviates significantly from recognized attack patterns, it's labeled as an "outlier," indicating a potential Zero-day attack.

### 4. Preventing Malicious Flows

Detection is just the first step. Our system ensures proactive protection. When malicious activity is detected:

- **Network Blocking:** A call to action is sent to our integrated firewall. It promptly blocks incoming connections from the identified malicious source. This swift response minimizes damage and safeguards the system from potential threats.

### In Conclusion

Here's the bottom line:

- **Collect Data:** We use Cicflowmeter to gather information about network traffic.
- **Classify It:** In Layer 1, we figure out if the data looks normal or suspicious.
- **Dig Deeper:** Layer 2 goes even further, looking for tricky stuff that's hard to spot.
- **Block the Trouble:** If we find something bad, our system stops it in its tracks.
