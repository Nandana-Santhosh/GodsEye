import React from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 overflow-hidden z-50" role="dialog">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl">
              <div className="flex-1 h-0 overflow-y-auto">
                <div className="py-6 px-4 bg-blue-700 sm:px-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-white">Notifications</h2>
                    <button
                      type="button"
                      className="rounded-md text-white hover:text-gray-200 focus:outline-none"
                      onClick={onClose}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="px-4 sm:px-6">
                    <div className="pt-6 pb-5">
                      {/* Add notification items here */}
                      <div className="space-y-4">
                        <div className="bg-yellow-50 p-4 rounded-md">
                          <p className="text-sm text-yellow-700">
                            New accident reported at Broadway & 7th Ave
                          </p>
                          <p className="text-xs text-yellow-500 mt-1">2 minutes ago</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-md">
                          <p className="text-sm text-green-700">
                            Accident #1234 verified by Officer Johnson
                          </p>
                          <p className="text-xs text-green-500 mt-1">15 minutes ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}