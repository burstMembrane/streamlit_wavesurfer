
dev:
	tmux kill-session -t dev 2>/dev/null || true
	tmux new -d -s dev \; \
	  split-window -h \; \
	  send-keys -t dev:0.0 "cd streamlit_wavesurfer/frontend && bun run dev" C-m \; \
	  send-keys -t dev:0.1 "streamlit run streamlit_wavesurfer/__init__.py" C-m
	tmux attach -t dev

build:
	uv build .
	cd streamlit_wavesurfer/frontend && bun run build

publish:
	uv publish 
