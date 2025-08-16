import { Activity } from '../types/activity'
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose 
} from './ui/drawer'
import { X, ExternalLink, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { NETWORK } from '../config/contracts'

interface ActivityDetailDrawerProps {
  activity: Activity | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ActivityDetailDrawer = ({ activity, open, onOpenChange }: ActivityDetailDrawerProps) => {
  const [, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success(`${fieldName} copied!`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  if (!activity) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        {/* iOS-style drag handle */}
        {/* <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" /> */}
        
        <DrawerHeader className="pb-0 px-4 py-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary capitalize tracking-tight">
              {activity.type.toLowerCase()} Details
            </DrawerTitle>
            <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-app-secondary" />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* Amount Section - iOS card style */}
          <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
            {activity.type === 'DEPOSIT' && activity.originalAmount && activity.vettingFeeAmount ? (
              <div className="space-y-2">
                <div className="px-0 py-1 border-b border-app bg-app-surface">
                  <h3 className="text-sm font-semibold text-app-primary">Deposit Breakdown</h3>
                </div>
                
                {/* Original Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-app-secondary">Original Amount:</span>
                  <span className="text-sm font-semibold text-app-primary tabular-nums">
                    {activity.originalAmount} ETH
                  </span>
                </div>
                
                {/* Vetting Fee */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-app-secondary">Vetting Fee:</span>
                  <span className="text-sm font-semibold text-red-500 tabular-nums">
                    -{activity.vettingFeeAmount} ETH
                  </span>
                </div>
                
                {/* Divider */}
                <div className="border-t border-app-border my-1"></div>
                
                {/* Final Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-app-secondary">Final Amount:</span>
                  <span className="text-lg font-bold text-app-primary tabular-nums">
                    {activity.amount} ETH
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-app-secondary mb-1">Amount</p>
                <p className="text-2xl font-bold text-app-primary tabular-nums">
                  {activity.displayAmount}
                </p>
                {activity.type === 'DEPOSIT' && (
                  <p className="text-xs text-app-tertiary mt-0.5">After vetting fees</p>
                )}
              </div>
            )}
          </div>

          {/* Details Grid - iOS grouped list style */}
          <div className="space-y-3">
            {/* Transaction Details */}
            <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-app bg-app-surface">
                <h3 className="text-sm font-semibold text-app-primary">Transaction</h3>
              </div>
              
              <div className="divide-y divide-app-border">
                {/* Transaction Hash */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Hash</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-app-primary">
                      {formatHash(activity.transactionHash)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(activity.transactionHash, 'Transaction Hash')}
                      className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                    >
                      <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                    </button>
                    <a
                      href={`${NETWORK.EXPLORER_URL}/tx/${activity.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-app-tertiary" />
                    </a>
                  </div>
                </div>

                {/* Block Number */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Block</span>
                  <span className="text-xs font-mono text-app-primary">
                    #{activity.blockNumber}
                  </span>
                </div>

                {/* Timestamp */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-app-secondary">Time</span>
                  <span className="text-xs text-app-primary">{activity.timestamp}</span>
                </div>

                {/* ASP Status - only for deposits */}
                {activity.type === 'DEPOSIT' && (
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-app-secondary">ASP Status</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        activity.status === 'approved' ? 'bg-green-500' : 
                        activity.status === 'pending' ? 'bg-yellow-500' : 
                        activity.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-app-primary capitalize">
                        {activity.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activity.type === 'WITHDRAWAL' && (
              <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
                <div className="px-3 py-2 border-b border-app">
                  <h3 className="text-sm font-semibold text-app-primary">Withdrawal Details</h3>
                </div>
                
                <div className="divide-y divide-app-border">
                  {/* Recipient */}
                  {activity.recipient && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-app-secondary">Recipient</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-app-primary">
                          {formatHash(activity.recipient)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(activity.recipient || '', 'Recipient')}
                          className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                        >
                          <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sponsorship Status */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-app-secondary">Gas Sponsored</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${activity.isSponsored ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-xs text-app-primary">
                        {activity.isSponsored ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* Fee Amount */}
                  {activity.feeAmount && (
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-app-secondary">Relay Fee</span>
                      <span className="text-xs font-mono text-app-primary">
                        {parseFloat(activity.feeAmount).toFixed(6)} ETH
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pool Information */}
            <div className="bg-app-surface rounded-xl border border-app shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-app">
                <h3 className="text-sm font-semibold text-app-primary">Pool</h3>
              </div>
              
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-app-secondary">Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-app-primary">
                    {formatHash(activity.poolId || '')}
                  </span>
                  <button
                    onClick={() => copyToClipboard(activity.poolId || '', 'Pool Address')}
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-app-tertiary" />
                  </button>
                  <a
                    href={`${NETWORK.EXPLORER_URL}/address/${activity.poolId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-app-tertiary" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}