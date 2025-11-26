import { useState } from 'react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Avatar, AvatarFallback} from './ui/avatar';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';

interface Settlement {
    from_id: string;
    from_name: string;
    to_id: string;
    to_name: string;
    amount: number;
}

interface SettleUpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settlement: Settlement | null;
    groupId: string; 
    onConfirm: (settlement: Settlement) => void;
}

export function SettleUpDialog({
    open,
    onOpenChange,
    settlement,
    groupId,
    onConfirm,
}: SettleUpDialogProps) {
    const [loading, setLoading] = useState(false);

    if (!settlement) {
        return null;
    }

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${groupId}/settle`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from_id: settlement.from_id,
                    to_id: settlement.to_id,
                    amount: settlement.amount
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to record settlement.');
            }
            onConfirm(settlement);
            toast.success('Settlement recorded!');
            onOpenChange(false);

        } catch (error: any) {
            toast.error(error.message || 'Failed to record settlement.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settle Up</DialogTitle>
                    <DialogDescription>
                        Confirm that this payment has been made.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        {/* From User */}
                        <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-12 w-12">
                                <AvatarFallback>{settlement.from_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{settlement.from_name}</span>
                        </div>

                        {/* Arrow and Amount */}
                        <div className="flex flex-col items-center text-center">
                            <span className="text-lg font-bold text-primary">
                                ${settlement.amount.toFixed(2)}
                            </span>
                            <ArrowRight className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">paid</span>
                        </div>

                        {/* To User */}
                        <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-12 w-12">
                                <AvatarFallback>{settlement.to_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{settlement.to_name}</span>
                        </div>
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                        This will create a new transaction to zero out the balance.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4 mr-2" />
                        )}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
