import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { supabase } from "../../utils/supabase/client";
import { useAuth } from "../../App";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  Users,
  Calculator,
  Plus,
  Minus,
  User,
  Zap, // Icon for AI button
  Upload, // Icon for Receipt Upload
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

// Define the shape of a group member (fetched from Supabase)
interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}

export function AddExpense() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGroup = searchParams.get("group");
  const { user } = useAuth(); // Your custom hook to get the logged-in user
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Expense type state
  const [expenseType, setExpenseType] = useState<"personal" | "group">(
    preselectedGroup ? "group" : "personal"
  );

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroup || "");
  const [paidBy, setPaidBy] = useState(user?.id || ""); // Correctly defaults to logged-in user
  const [splitMethod, setSplitMethod] = useState<"equal" | "unequal">("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([
    user?.id || "",
  ]);
  const [unequalAmounts, setUnequalAmounts] = useState<{
    [key: string]: string;
  }>({});
  const [amountErrors, setAmountErrors] = useState<{ [key: string]: string }>(
    {}
  );

  // Data state
  const [groups, setGroups] = useState<any[]>([]);
  const [currentMembers, setCurrentMembers] = useState<GroupMember[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false); // For AI Categorize
  const [receiptFile, setReceiptFile] = useState<File | null>(null); // For Receipt Upload
  const [isParsingReceipt, setIsParsingReceipt] = useState(false); // For Receipt Upload

  // ----------------------------------------------------------------
  // DATA FETCHING (Replaces Dummy Data)
  // ----------------------------------------------------------------

  // Fetch the user's groups from Supabase when the component loads
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;

      // Use the Supabase database function 'get_user_groups'
      const { data, error } = await supabase.rpc("get_user_groups");

      if (error) {
        console.error("Error fetching groups:", error);
        toast.error("Could not load your groups.");
      } else {
        setGroups(data || []);
        // If a group was preselected (e.g., coming from a group page), set it
        if (
          preselectedGroup &&
          data.find((g: any) => g.id === preselectedGroup)
        ) {
          setSelectedGroup(preselectedGroup);
        }
      }
    };

    fetchGroups();
  }, [user, preselectedGroup]);

  // Fetch members whenever the selected group changes
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!selectedGroup || !user) {
        setCurrentMembers([]);
        return;
      }

      try {
        setLoading(true);

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("No active session");
        }

        // Fetch members using the API endpoint
        const response = await fetch(
          `http://localhost:8000/api/groups/${selectedGroup}/members`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch group members");
        }

        const data = await response.json();
        const members = data.members || [];

        // Format members data
        const formattedMembers: GroupMember[] = members.map((member: any) => ({
          id: member.user_id || member.id,
          name: member.name || member.email || "No Name",
          avatar: member.avatar_url || "",
          email: member.email || "",
        }));

        setCurrentMembers(formattedMembers);

        // Reset split members to just the current user by default
        setSelectedMembers(formattedMembers.map(member => member.id));
        setPaidBy(user.id);
        setUnequalAmounts({});
        setAmountErrors({});
      } catch (error) {
        console.error("Error fetching group members:", error);
        toast.error("Could not load group members. Please try again.");
        setCurrentMembers([]);
      } finally {
        setLoading(false);
      }
      // --- END OF MODIFICATION ---
    };

    fetchGroupMembers();
  }, [selectedGroup, user]);

  // This useEffect will run once and fetch all available categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return; // Wait for the user to be loaded

      // Call the database function
      const { data, error } = await supabase.rpc("get_all_user_categories");

      if (error) {
        console.error("Error fetching categories:", error);
        toast.error("Could not load your categories.");
      } else {
        // Use a Set to automatically remove any duplicates, then save to state
        const uniqueCategories = [...new Set(data as string[])];
        setAvailableCategories(uniqueCategories);
      }
    };

    fetchCategories();
  }, [user]); // Run this whenever the user object is available

  // ----------------------------------------------------------------
  // AI/FEATURE HANDLERS
  // ----------------------------------------------------------------

  const handleAICategorize = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title or description first.");
      return;
    }
    setIsCategorizing(true);
    const toastId = toast.loading("Asking the AI for a category...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const formData = new FormData();
      formData.append("description", title);
      formData.append("category", ""); // Trigger prediction mode

      const response = await fetch("http://localhost:8000/api/categorize", {
        // MAKE SURE PORT IS CORRECT
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("AI server failed to respond.");

      const result = await response.json();
      const aiCategoryLabel = result.category;

      if (aiCategoryLabel) {
        // Check if the AI's suggestion is already in our dropdown
        if (!availableCategories.includes(aiCategoryLabel)) {
          // If not, add it to our state so it's in the list
          setAvailableCategories((prevCategories) => [
            ...prevCategories,
            aiCategoryLabel,
          ]);
        }
        // Now, set the dropdown to the AI's suggestion
        setCategory(aiCategoryLabel);
        toast.success(`AI suggested: ${aiCategoryLabel}`, { id: toastId });
      } else {
        throw new Error("AI could not determine a category.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to get AI category.", {
        id: toastId,
      });
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file) return;

    setReceiptFile(file);
    setIsParsingReceipt(true);
    const toastId = toast.loading("Parsing receipt...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please log in to upload receipts", { id: toastId });
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("http://localhost:8000/api/parse-bill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse receipt");
      }

      const { parsed } = await response.json();

      // Auto-fill the form fields with parsed data
      if (parsed.vendor_name) setTitle(parsed.vendor_name);
      if (parsed.total) setAmount(parsed.total.toString());
      if (parsed.issue_date) {
        const date = new Date(parsed.issue_date);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toISOString().split("T")[0];
          setDescription((currentDesc) =>
            `Date: ${formattedDate}\n${parsed.notes || ""}`.trim()
          );
        }
      } else if (parsed.notes) {
        setDescription(parsed.notes);
      }

      // Try to find a matching category (MODIFIED to use string array)
      if (parsed.category_guess) {
        const normalizedGuess = parsed.category_guess.toLowerCase().trim();

        // Find a match in the user's availableCategories
        let matchedCategory = availableCategories.find(
          (cat) => cat.toLowerCase() === normalizedGuess
        );

        // If no exact match, try partial match
        if (!matchedCategory) {
          matchedCategory = availableCategories.find(
            (cat) =>
              cat.toLowerCase().includes(normalizedGuess) ||
              normalizedGuess.includes(cat.toLowerCase())
          );
        }

        // If a match is found, set it.
        if (matchedCategory) {
          setCategory(matchedCategory);
        } else {
          // If no match, but the AI gave a guess, add it as a new category
          // and select it.
          const capitalizedGuess =
            parsed.category_guess.charAt(0).toUpperCase() +
            parsed.category_guess.slice(1);
          if (!availableCategories.includes(capitalizedGuess)) {
            setAvailableCategories((prev) => [...prev, capitalizedGuess]);
          }
          setCategory(capitalizedGuess);
        }
      }

      toast.success("Receipt processed successfully!", { id: toastId });
    } catch (error) {
      console.error("Error processing receipt:", error);
      toast.error("Failed to process receipt. Please enter details manually.", {
        id: toastId,
      });
    } finally {
      setIsParsingReceipt(false);
    }
  };

  // ----------------------------------------------------------------
  // FORM HANDLERS (Split Logic)
  // ----------------------------------------------------------------

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleUnequalAmountChange = (memberId: string, value: string) => {
    setAmountErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[memberId];
      return newErrors;
    });

    if (value === "") {
      setUnequalAmounts((prev) => ({ ...prev, [memberId]: "" }));
      return;
    }

    const numberRegex = /^\d*\.?\d*$/; // Allow only numbers and a decimal
    if (!numberRegex.test(value)) {
      setAmountErrors((prev) => ({ ...prev, [memberId]: "Invalid number" }));
      return;
    }

    setUnequalAmounts((prev) => ({ ...prev, [memberId]: value }));
  };

  const calculateSplitAmounts = () => {
    const totalAmount = Number.parseFloat(amount) || 0;
    const numMembers = selectedMembers.length;

    if (splitMethod === "equal") {
      if (numMembers === 0) return {};
      const equalAmount = totalAmount / numMembers;
      return selectedMembers.reduce((acc, memberId) => {
        acc[memberId] = equalAmount.toFixed(2);
        return acc;
      }, {} as { [key: string]: string });
    }

    if (splitMethod === "unequal") {
      return unequalAmounts;
    }
    return {};
  };

  const splitAmounts = calculateSplitAmounts();
  const totalSplit = Object.values(splitAmounts).reduce(
    (sum, amount) => sum + Number.parseFloat(amount || "0"),
    0
  );

  // ----------------------------------------------------------------
  // FINAL SUBMIT HANDLER (Connects to Supabase & Python)
  // ----------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- 1. VALIDATION ---
    if (!title.trim()) {
      toast.error("Please enter an expense title");
      setLoading(false);
      return;
    }
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error("Please enter a valid amount");
      setLoading(false);
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      setLoading(false);
      return;
    }

    // --- 2. GET SUPABASE SESSION ---
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token || !user) {
      toast.error("Please log in to add an expense");
      setLoading(false);
      return;
    }

    try {
      // --- 3. "LEARNING" CALL TO PYTHON SERVER (Fire-and-Forget) ---
      // This tells the AI backend what the user manually chose, so it can learn.
      const learningFormData = new FormData();
      learningFormData.append("description", title);
      learningFormData.append("amount", String(finalAmount));
      learningFormData.append("category", category); // Pass the final category label

      fetch("http://localhost:8000/api/categorize", {
        // Make sure this port is correct!
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: learningFormData,
      }).catch((err) => {
        // Log the error but don't stop the user from saving their expense
        console.error("AI Learning call failed (this is non-critical):", err);
      });

      // --- 4. SAVE THE EXPENSE TO SUPABASE DATABASE ---
      if (expenseType === "personal") {
        // --- Save a Personal Expense ---
        const { error: expenseError } = await supabase.from("expenses").insert({
          description: title,
          amount: finalAmount,
          category: category, // Save the category label directly
          payer_id: user.id,
          group_id: null, // This is what makes it a personal expense
          date: new Date().toISOString(),
        });

        if (expenseError) throw expenseError;

        toast.success("Personal expense added successfully!");
        navigate("/dashboard"); // Go back to the dashboard
      } else {
        // --- Save a Group Expense ---

        // Group-specific validation
        if (!selectedGroup) {
          toast.error("Please select a group");
          setLoading(false);
          return;
        }
        if (selectedMembers.length === 0) {
          toast.error("Please select at least one person to split with");
          setLoading(false);
          return;
        }

        // Calculate final splits
        const finalSplits: { user_id: string; amount_owed: number }[] = [];

        if (splitMethod === "equal") {
          const equalAmount = finalAmount / selectedMembers.length;
          selectedMembers.forEach((memberId) => {
            finalSplits.push({ user_id: memberId, amount_owed: equalAmount });
          });
        } else {
          // Unequal split
          // Check if the amounts add up
          if (Math.abs(totalSplit - finalAmount) > 0.01) {
            toast.error(
              `Unequal amounts must add up to the total expense ($${finalAmount.toFixed(
                2
              )})`
            );
            setLoading(false);
            return;
          }
          currentMembers.forEach((member) => {
            finalSplits.push({
              user_id: member.id,
              amount_owed: parseFloat(unequalAmounts[member.id] || "0"),
            });
          });
        }

        // Call the Supabase Database Function to save everything at once
        const { error: rpcError } = await supabase.rpc(
          "create_group_expense_and_splits",
          {
            expense_data: {
              description: title,
              amount: finalAmount,
              category: category,
              payer_id: paidBy,
              group_id: selectedGroup,
            },
            splits_data: finalSplits,
          }
        );

        if (rpcError) throw rpcError;

        toast.success("Group expense added successfully!");
        navigate("/groups/" + selectedGroup); // Go to the group page
      }
    } catch (error: any) {
      // This will catch errors from either the Supabase insert or the RPC call
      console.error("Error adding expense:", error);
      toast.error(error.message || "Failed to add expense");
    } finally {
      // No matter what, stop the loading spinner
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // JSX (UI Rendering)
  // ----------------------------------------------------------------
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Add Expense</h1>
          <p className="text-muted-foreground">
            {expenseType === "personal"
              ? "Track your personal expense"
              : "Split a new expense with your group"}
          </p>
        </div>
      </div>

      {/* Expense Type Navigation */}
      <Tabs
        value={expenseType}
        onValueChange={(value) => setExpenseType(value as "personal" | "group")}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="group" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information - Always shown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Dinner at Italian Restaurant"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {/* This makes sure the list is always up-to-date */}
                  {[
                    ...new Set(
                      availableCategories.concat(category ? [category] : [])
                    ),
                  ].map((categoryName) => (
                    <SelectItem key={categoryName} value={categoryName}>
                      {categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* AI Categorize Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAICategorize}
                disabled={isCategorizing || !title.trim()}
                className="w-full flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {isCategorizing ? "Asking AI..." : "Auto-Categorize with AI"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Group Selection - Only shown for group expenses */}
        {expenseType === "group" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Group & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group">Select Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => {
                      return (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedGroup && currentMembers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    This group has {currentMembers.length}{" "}
                    {currentMembers.length === 1 ? "member" : "members"}
                  </p>
                )}
              </div>

              {selectedGroup && (
                <div className="space-y-2">
                  <Label>Paid by</Label>
                  <RadioGroup value={paidBy} onValueChange={setPaidBy}>
                    {currentMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem
                          value={member.id}
                          id={`payer-${member.id}`}
                        />
                        <Label
                          htmlFor={`payer-${member.id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={member.avatar}
                              alt={member.name}
                            />
                            <AvatarFallback className="text-xs">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {member.name}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Split Configuration - Only shown for group expenses */}
        {expenseType === "group" && selectedGroup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Split Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Split Method */}
              <div className="space-y-3">
                <Label>Split Method</Label>
                <RadioGroup
                  value={splitMethod}
                  onValueChange={(value) =>
                    setSplitMethod(value as "equal" | "unequal")
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="equal" id="equal" />
                    <Label htmlFor="equal" className="cursor-pointer">
                      Equal Division
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unequal" id="unequal" />
                    <Label htmlFor="unequal" className="cursor-pointer">
                      Unequal Division
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Equal Division - Member Selection */}
              {splitMethod === "equal" && (
                <div className="space-y-3">
                  <div>
                    <Label>Select members to split equally among</Label>
                  </div>
                  <div className="space-y-3">
                    {currentMembers.map((member) => {
                      const isSelected = selectedMembers.includes(member.id);
                      const splitAmount = splitAmounts[member.id] || "0.00";
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                handleMemberToggle(member.id)
                              }
                              id={`member-${member.id}`}
                            />
                            <Label
                              htmlFor={`member-${member.id}`}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={member.avatar}
                                  alt={member.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{member.name}</div>
                                {member.email && (
                                  <div className="text-xs text-muted-foreground">
                                    {member.email}
                                  </div>
                                )}
                              </div>
                            </Label>
                          </div>
                          {isSelected && amount && (
                            <Badge variant="outline" className="ml-2">
                              ${splitAmount}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unequal Division - Input boxes */}
              {splitMethod === "unequal" && (
                <div className="space-y-3">
                  <div>
                    <Label>Enter amount for each member</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Amounts must add up to the total expense.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {currentMembers.map((member) => {
                      const memberAmount = unequalAmounts[member.id] || "";
                      const hasError = amountErrors[member.id];
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={member.avatar}
                                alt={member.name}
                              />
                              <AvatarFallback className="text-xs">
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{member.name}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={memberAmount}
                                onChange={(e) =>
                                  handleUnequalAmountChange(
                                    member.id,
                                    e.target.value
                                  )
                                }
                                className={`w-28 text-right pl-8 ${hasError ? "border-red-500" : ""
                                  }`}
                              />
                            </div>
                            {hasError && (
                              <span className="text-xs text-red-500">
                                {hasError}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Split Summary */}
              {amount && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Expense Amount:</span>
                    <span className="font-bold">
                      ${Number.parseFloat(amount).toFixed(2)}
                    </span>
                  </div>

                  {splitMethod === "equal" && selectedMembers.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Amount per Member:</span>
                      <span className="font-bold text-green-600">
                        $
                        {(
                          Number.parseFloat(amount) / selectedMembers.length
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {splitMethod === "unequal" && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Amount Split:</span>
                        <span
                          className={`font-bold ${Math.abs(totalSplit - Number.parseFloat(amount)) >
                              0.01
                              ? "text-red-600"
                              : "text-green-600"
                            }`}
                        >
                          ${totalSplit.toFixed(2)}
                        </span>
                      </div>
                      {Math.abs(totalSplit - parseFloat(amount)) > 0.01 && (
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Remaining to allocate:</span>
                          <span>
                            $
                            {Math.abs(
                              Number.parseFloat(amount) - totalSplit
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Receipt Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Receipt (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {receiptFile
                  ? `Selected: ${receiptFile.name}`
                  : "Drag and drop your receipt here, or click to browse"}
              </p>
              <div className="relative">
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/*,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleReceiptUpload(file);
                    }
                  }}
                  disabled={isParsingReceipt}
                />
                <Button
                  type="button" // Important: type="button" so it doesn't submit the form
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("receipt-upload")?.click()
                  } // Manually trigger file input
                  disabled={isParsingReceipt}
                >
                  {isParsingReceipt ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : receiptFile ? (
                    "Change File"
                  ) : (
                    "Choose File"
                  )}
                </Button>
                {receiptFile && !isParsingReceipt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => setReceiptFile(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: JPG, PNG, PDF
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" asChild>
            <Link to="/dashboard">Cancel</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading || isCategorizing || isParsingReceipt}
          >
            {loading ? "Adding Expense..." : "Add Expense"}
          </Button>
        </div>
      </form>
    </div>
  );
}
