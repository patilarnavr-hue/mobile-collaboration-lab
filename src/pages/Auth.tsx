import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_, session) => {
        if (session) navigate("/");
      });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // EMAIL SIGN UP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });

    if (error) toast.error(error.message);
    else toast.success("Account created!");

    setLoading(false);
  };

  // EMAIL SIGN IN
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) toast.error(error.message);
    else toast.success("Welcome back!");

    setLoading(false);
  };

  // GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    setLoading(true);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    setLoading(false);
  };

  // SEND PHONE OTP
  const handleSendOTP = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) toast.error(error.message);
    else toast.success("OTP sent to your phone");

    setLoading(false);
  };

  // VERIFY PHONE OTP
  const handleVerifyOTP = async () => {
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (error) toast.error(error.message);
    else toast.success("Phone verified!");

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Sprout className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">AgroEye</CardTitle>
          <CardDescription>
            Monitor and manage your crops with ease
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* SIGN IN TAB */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <Separator className="my-4" />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  Continue with Google
                </Button>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="w-full"
                  >
                    Send OTP
                  </Button>

                  <Input
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />

                  <Button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    className="w-full"
                  >
                    Verify OTP
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* SIGN UP TAB */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
