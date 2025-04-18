import setuptools

setuptools.setup(
    name="streamlit_wavesurfer",
    version="0.0.4",
    author="Liam Power",
    author_email="info@liampower.dev",
    description="A Streamlit component for displaying and interacting with audio waveforms.",
    long_description="",
    long_description_content_type="text/plain",
    url="https://github.com/burstMembrane/streamlit_wavesurfer",
    packages=setuptools.find_packages(),
    include_package_data=True,
    classifiers=[],
    python_requires=">=3.6",
    install_requires=[
        "streamlit >= 0.63",
        "librosa >= 0.10.0",
    ],
)
