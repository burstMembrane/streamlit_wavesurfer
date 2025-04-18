import {
    Streamlit,
    StreamlitComponentBase,
    withStreamlitConnection,
} from "streamlit-component-lib"
import React, { ReactNode } from "react"
import { WavesurferViewer, Region } from "./components/WaveformViewer"


interface State {
    ready: Boolean
}


/**
 * This is a React-based component template. The `render()` function is called
 * automatically when your component should be re-rendered.
 */
class WavesurferComponent extends StreamlitComponentBase<State> {
    public state = { ready: false }

    public componentDidMount() {
        super.componentDidMount();
    }
    public componentDidUpdate() {
        super.componentDidUpdate();
        Streamlit.setFrameHeight()
    }

    public render = (): ReactNode => {
        const regions = this.props.args["regions"] ?
            this.props.args["regions"].map((e: any) => new Region(e.start, e.end, e.content, e.color, e.drag, e.resize)) :
            [];
        const audioSrc = this.props.args["audio_src"];
        console.log(`audioSrc: ${audioSrc}`)

        const wavesurfer = <WavesurferViewer audioSrc={audioSrc}
            regions={regions}
            onReady={() => {
                if (!this.state.ready) {
                    console.log("Ready!!!!")
                    this.setState({ ready: true })
                    setTimeout(() => Streamlit.setComponentValue(1), 300)
                }
            }}
        />;

        return (
            // @ts-ignore
            <center>{wavesurfer}</center>
        )
    }

}

// "withStreamlitConnection" is a wrapper function. It bootstraps the
// connection between your component and the Streamlit app, and handles
// passing arguments from Python -> Component.
//
// You don't need to edit withStreamlitConnection (but you're welcome to!).
export default withStreamlitConnection(WavesurferComponent)
