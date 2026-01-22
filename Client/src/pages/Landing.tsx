import { Link } from "react-router-dom";
import {
  Trophy,
  Shield,
  Zap,
  Users,
  Globe,
  Smartphone,
  Award,
  CheckCircle,
} from "lucide-react";

const Landing = () => {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Guaranteed Prize Payouts",
      description:
        "Every prize is secured via mandatory escrow before tournament starts. No more non-payment risks.",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "AI-Assisted Results",
      description:
        "Automated winner verification reduces disputes and ensures fair competition.",
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile Money Integration",
      description:
        "Seamless payments with MTN, Vodafone, and AirtelTigo. Play, win, and withdraw in GHS.",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Player Career Building",
      description:
        "Build your esports profile, track stats, get discovered by sponsors, and grow your career.",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Online & Hybrid Tournaments",
      description:
        "Compete from anywhere. Support for online, offline, and hybrid tournament formats.",
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Professional Infrastructure",
      description:
        "Everything organizers need: brackets, streaming, payments, and prize distribution.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description: "Create your free account in under 2 minutes",
    },
    {
      number: "2",
      title: "Choose Tournament",
      description: "Browse verified tournaments with guaranteed prizes",
    },
    {
      number: "3",
      title: "Compete & Win",
      description: "Show your skills and climb the leaderboards",
    },
    {
      number: "4",
      title: "Get Paid Instantly",
      description: "Receive prizes directly to your Mobile Money",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden bg-cover bg-center h-[100vh]"
        style={{
          backgroundImage: "url(https://wallpapercave.com/wp/wp10059648.jpg)",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-2 bg-linear-to-r from-blue-600 to-blue-400 rounded-xl mb-6">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Professional Esports
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-blue-400">
                Tournament Platform
              </span>
            </h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-10">
              The trusted esports infrastructure for Ghana and West Africa.
              Compete in verified tournaments with
              <span className="font-semibold text-blue-600">
                {" "}
                100% guaranteed prizes via escrow
              </span>
              .
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-linear-to-r from-blue-600 to-blue-400 rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
              >
                Start Competing Free
                <Trophy className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/tournaments"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Browse Tournaments
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-linear-to-r from-blue-600 to-blue-400 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">100%</div>
              <div className="text-blue-100">Guaranteed Prizes</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">0%</div>
              <div className="text-blue-100">Payment Risk</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">10%</div>
              <div className="text-blue-100">Platform Fee</div>
              <div className="text-sm text-blue-200">(Lowest in region)</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">1%</div>
              <div className="text-blue-100">Escrow Fee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for Ghana's Esports Ecosystem
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We solve the biggest challenges facing competitive gaming in West
              Africa
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="inline-flex p-3 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-linear-to-br from-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Started in 4 Simple Steps
            </h2>
            <p className="text-lg text-gray-600">
              From registration to getting paid - all automated and secure
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-linear-to-r from-blue-600 to-blue-400 text-white text-2xl font-bold mb-6">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-3/4 w-full h-1 bg-linear-to-r from-blue-600 to-blue-400 opacity-30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Organizers Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-linear-to-r from-blue-600 to-blue-500 rounded-2xl p-8 md:p-12 text-white">
            <div className="md:flex items-center justify-between">
              <div className="mb-8 md:mb-0 md:max-w-xl">
                <h2 className="text-3xl font-bold mb-4">
                  Organize Professional Tournaments
                </h2>
                <p className="text-blue-100 mb-6">
                  Run credible tournaments with automated registration, secure
                  payments, guaranteed prize distribution, and built-in
                  streaming tools.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-blue-300" />
                    <span>Mandatory prize escrow builds trust</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-blue-300" />
                    <span>90% of entry fees go to you</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-blue-300" />
                    <span>Access to verified player database</span>
                  </li>
                </ul>
              </div>
              <div>
                <Link
                  to="/signup?type=organizer"
                  className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Become an Organizer
                  <Users className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Compete with Confidence?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join Ghana's first esports platform with 100% guaranteed prize
            payouts. No more empty promises - just pure competition.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-linear-to-r from-blue-600 to-blue-400 rounded-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              Create Free Account
              <Trophy className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-gray-700 hover:text-gray-900"
            >
              Learn more about escrow →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Landing;
