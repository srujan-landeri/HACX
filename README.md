# Zero-day Attack Detection and Prevention System.

## Overview

This project aims to detect and prevent zero-day network attacks in real-time. Zero-day attacks exploit unknown vulnerabilities and pose significant threats to network security. Our system utilizes machine learning and network flow analysis to identify and block malicious activity, enhancing cybersecurity.

## Features

- Real-time network traffic monitoring
- Two-layer machine learning model
- Anomaly detection using LOF, Isolation Forest.
- Integration with native OS blocking technologies.

## How It Works

1. **Data Collection**: Network flows are collected in real-time CIC Flowmeter.

2. **Layer 1 Analysis**: Machine learning models like XGBoost classify flows as benign or potentially malicious.

3. **Layer 2 Anomaly Detection**: Unsupervised models identify patterns of known attacks and anomalies.

4. **Blocking**: Malicious connections trigger OS-level blocking, preventing further compromise.

## Usage

1. Install Python 3.x and required libraries.
   
2. Clone this repository.
   
3. Run the system and monitor network traffic.

## Datasets

We use the CSE-CIC-IDS 2017 and 2018 datasets for training and testing.

## Prerequisites

- Python 3.x
- Required libraries

## Installation

1. Clone the repository.

2. Install Python and required libraries.

3. Run the system.

## Contributing

We welcome contributions and collaboration.

## License

This project is licensed under the MIT - see the [LICENSE.md](LICENSE.md) file for details.
