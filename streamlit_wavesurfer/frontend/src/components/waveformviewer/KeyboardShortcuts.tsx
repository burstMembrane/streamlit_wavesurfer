import React, { useState } from 'react';
import { Keyboard } from 'lucide-react';

export const KeyboardShortcuts = ({ showAll = false }) => {
    const [showShortcuts, setShowShortcuts] = useState(false);

    const allShortcuts = [
        { key: 'i', description: 'set region start' },
        { key: 'o', description: 'set region end' },
        { key: 's', description: 'play region start' },
        { key: 'e', description: 'play region end' },
        { key: 'space', description: 'play/pause' },
        { key: '↑', description: 'prev region' },
        { key: '↓', description: 'next region' },
        { key: '←', description: 'seek -0.1s' },
        { key: '→', description: 'seek +0.1s' },
        { key: 'l', description: 'loop region' },
        { key: 'w', description: 'skip to start' },
    ];

    const basicShortcuts = allShortcuts.filter(s =>
        ['space', '←', '→', 'u'].includes(s.key)
    );

    const shortcuts = showAll ? allShortcuts : basicShortcuts;

    return (
        <div className="relative">
            <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
            >
                <Keyboard size={20} />
            </button>

            {showShortcuts && (
                <div className="absolute top-0 right-0 bg-gray-800 p-2 rounded-md shadow-md z-1000 w-64">
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                        {shortcuts.map((shortcut) => (
                            <React.Fragment key={shortcut.key}>
                                <div className="font-bold px-2 py-1 bg-gray-700 rounded-md text-center">
                                    {shortcut.key}
                                </div>
                                <div>{shortcut.description}</div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
};
