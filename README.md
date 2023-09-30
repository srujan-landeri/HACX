# Autonomous AI based Zero-day Attack Detection and Prevention System.

## Overview

This project's objective is to create a threat detection engine capable of identifying and proactively countering Zero-day attacks in real-time, utilizing advanced machine learning techniques. The final product is an Electron application, built upon the widely adopted Chromium-based framework, popularly used in building standalone desktop applications.

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

## Datasets

Datasets used for training and testing purposes are CSE-CIC-IDS 2017 and 2018 datasets.

## Prerequisites

To run this application, you'll need the following prerequisites:

- Python 3.x
- Required libraries

  Please refer to the [Tools and Requirements](https://github.com/srujan-landeri/HACX/tree/main/Tools%20and%20Requirements) for detailed information on the required libraries.

## Contributing

Contributions to this project are highly encouraged. 

## License

This project is licensed under the MIT - see the [LICENSE.md](LICENSE.md) file for details.
